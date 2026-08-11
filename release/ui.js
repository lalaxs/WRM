// ============================================================
// ui.js — DOM/CSS 界面控制器（混合架构的 UI 层）
// 角色创建/编辑 + 主游戏外壳（顶栏/左导航/内容区）+ 弹窗（突破/离线/轮回）+ toast
// 全部用 HTML+CSS 实现；游戏世界（角色立绘）仍由 game.js 合成位图，这里只 blit 到小 canvas。
// UI 只通过 window.GameAPI 调游戏逻辑，不直接碰游戏内部状态。
// ============================================================
(function () {
  'use strict';

  // ── 角色创建页用的部件类别 ──
  const CATS = ['body', 'cloth', 'nose', 'mouth', 'eyes', 'eyebrush', 'hair'];
  const CAT_LABEL = {
    body: '身体', cloth: '衣服', nose: '鼻子', mouth: '嘴',
    eyes: '眼睛', eyebrush: '眉眼', hair: '头发'
  };

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
  let root = null;
  let shell = { built: false };
  let navState = { lastIndex: -1 };
  let contentState = { key: null, refs: {} };
  let inventoryUiState = { category: 'all', sortMode: 'category' };
  let cropSelections = {};
  let farmUiState = { selectedPlotId: null, quickCropId: '' };
  let combatUiState = { tab: 'regions' };
  let loadoutUiState = { selectedId: null };
  let eventUiState = { section: 'summary', filter: 'all' };
  let relationshipUiState = {
    search: '',
    sort: 'recent',
    selectedId: null
  };
  let inheritanceUiState = { section: 'overview' };
  let worldUiState = { scope: 'nearby', regionId: null };
  let modalRoot = null, modals = {
    break: { built: false },
    offline: { built: false },
    lunhui: { built: false },
    legacy: { built: false },
    lifespanBuffer: { built: false },
    itemDetail: { built: false },
    expand: { built: false },
    farmPlot: { built: false }
  };
  let itemTip = { built: false, root: null, refs: null, open: false };
  let equipmentTip = {
    built: false,
    root: null,
    refs: null,
    open: false
  };
  let toastStack = null;
  let persistenceUi = null;

  // 角色创建页
  let created = false, card = null, titleEl = null, confirmBtn = null;
  let previewCanvas = null, previewCtx = null, selIndexEls = {}, isCreateMode = true;
  let creatorProgressControls = [];

  const GATHER_NAV = ['采药', '采矿', '伐木', '钓鱼'];
  const PRODUCTION_NAV = ['炼丹', '炼器', '烹饪', '符箓'];
  const CAVE_TABS = [
    ['farm', '灵田'],
    ['formations', '阵法'],
    ['beasts', '灵兽'],
    ['meetingHall', '会客厅'],
    ['inheritance', '传承殿']
  ];
  const CATEGORY_LABELS = {
    all: '全部',
    material: '材料',
    equipment: '装备',
    consumable: '消耗品',
    technique: '功法',
    quest: '任务物品'
  };
  const QUALITY_LABELS = {
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
  const QUALITY_TIER = {
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
  // 采集点资源品质（独立于背包物品品质的另一套三阶体系）
  const RESOURCE_QUALITY_LABELS = {
    common: '普通', fine: '精良', rare: '珍稀'
  };
  const INV_CATEGORY_ORDER = {
    material: 0, equipment: 1, consumable: 2, technique: 3, quest: 4
  };
  const COMBAT_TABS = [
    ['regions', '普通区域'],
    ['dungeons', '副本'],
    ['sectTrial', '宗门试炼'],
    ['specialRealm', '特殊秘境']
  ];
  const EQUIPMENT_LABELS = {
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
  const EQUIPMENT_SLOTS = [
    'weapon',
    'head',
    'robe',
    'bracer',
    'belt',
    'boots',
    'accessory',
    'artifact'
  ];
  const COMBAT_STAT_LABELS = {
    maxHp: '最大气血',
    maxQi: '最大真气',
    attack: '攻击',
    defense: '防御',
    accuracy: '命中',
    evasion: '闪避',
    critChance: '暴击率',
    critDamage: '暴击伤害',
    actionIntervalTicks: '行动间隔缩减',
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
  const SUPPLY_LABELS = {
    food: '食物',
    pill: '丹药',
    talisman: '符箓'
  };
  const CONDITION_TYPES = [
    ['always', '始终'],
    ['selfHpBelow', '自身气血低于'],
    ['enemyHpBelow', '敌方气血低于'],
    ['selfQiAbove', '自身真气高于'],
    ['enemyHasStatus', '敌方具有状态'],
    ['selfMissingBuff', '自身缺少增益']
  ];

  // ============================================================
  // 外壳（顶栏 + 左导航 + 内容区）+ 弹窗容器 + toast
  // ============================================================
  function buildShell() {
    if (shell.built) return;
    const a = api(); if (!a) return;
    root = document.getElementById('ui');

    const sh = el('div', 'shell', root); shell.root = sh; sh.style.display = 'none';

    // ── 顶栏 ──
    const tb = el('div', 'topbar', sh);
    const av = el('canvas', 'avatar', tb); shell.avatar = av; shell.avatarCtx = av.getContext('2d');
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
    const realmEl = el('div', 'realm-label', row2, '');
    const expBar = el('div', 'exp-bar', row2);
    const expFill = el('div', 'exp-fill', expBar);
    const expText = el('div', 'exp-text', expBar, '');
    const breakBtn = el('button', 'btn-break', row2, '突破');
    breakBtn.addEventListener('click', () => a.commands.openBreak());

    shell.topbar = { nameEl, pills: pillRefs, realmEl, expFill, expText, breakBtn };

    // ── 行动状态拓展栏（顶部资源栏下方，全局显示当前行动）──
    const actionBarRoot = el('div', 'action-bar', sh);
    const actionBarName = el('div', 'action-bar-name', actionBarRoot, '空闲');
    const actionBarTrack = el('div', 'action-bar-track', actionBarRoot);
    const actionBarFill = el('div', 'action-bar-fill', actionBarTrack);
    shell.actionBar = { root: actionBarRoot, nameEl: actionBarName, fillEl: actionBarFill };

    // ── 身体：导航 + 内容 ──
    const body = el('div', 'body', sh);
    const nav = el('div', 'nav', body); shell.nav = { listEl: nav, items: [] };
    const navList = a.queries.navigation().items;
    for (let i = 0; i < navList.length; i++) {
      const it = el('div', 'nav-item', nav, navList[i].label);
      it.addEventListener('click', () => a.commands.switchNav({ index: i }));
      shell.nav.items.push(it);
    }
    const content = el('div', 'content', body); shell.content = content;

    // ── 弹窗容器 + toast ──
    modalRoot = el('div', 'modal-root', root);
    modalRoot.style.pointerEvents = 'none';
    for (const name of ['break', 'offline', 'lunhui', 'legacy', 'lifespanBuffer', 'itemDetail', 'expand', 'farmPlot']) {
      modals[name].root = el('div', 'modal-mask', modalRoot);
      if (name === 'farmPlot') {
        modals[name].root.className = 'modal-mask farm-plot-mask';
      }
      modals[name].root.style.display = 'none';
    }
    toastStack = el('div', 'toast-stack', root);
    toastStack.style.pointerEvents = 'none';

    const persistenceRoot = el('div', 'persistence-error', root);
    persistenceRoot.style.display = 'none';
    const persistenceMessage = el('div', 'persistence-message', persistenceRoot, '保存失败，请重试');
    const persistenceRetry = el('button', 'persistence-retry', persistenceRoot, '重试');
    persistenceRetry.addEventListener('click', () => {
      a.commands.retryPersistence();
      renderGame();
    });
    persistenceUi = {
      root: persistenceRoot,
      message: persistenceMessage,
      retry: persistenceRetry
    };

    shell.built = true;
  }

  function showShell() { if (shell.root) shell.root.style.display = 'flex'; }
  function hideShell() { if (shell.root) shell.root.style.display = 'none'; }

  function refreshAvatar() {
    const a = api(); if (!a || !shell.avatar) return;
    a.render.drawCharacter(shell.avatar);
  }

  function updateTopbar() {
    const a = api(); const info = a.queries.top(); const t = shell.topbar;
    t.nameEl.textContent = info.name;
    t.pills.lingshi.textContent = String(info.pills.lingshi);
    t.pills.jingqi.textContent = String(info.pills.jingqi);
    t.pills.mood.textContent = String(Math.floor(info.pills.mood || 0));
    t.pills.shengwang.textContent = String(info.pills.shengwang);
    t.pills.shouyuan.textContent = info.shouyuan == null
      ? '∞'
      : String(Math.max(0, Math.floor(info.shouyuan)));
    t.realmEl.textContent = info.realm;
    const ratio = Math.min(1, info.xiwei / (info.need || 1));
    t.expFill.style.width = (ratio * 100) + '%';
    t.expText.textContent = info.xiwei + '/' + (info.need || 0);
    t.breakBtn.classList.toggle('disabled', !info.canBreak);
  }

  function updateActionBar() {
    const a = api(); if (!a || !shell.actionBar) return;
    const info = a.queries.home();
    const bar = shell.actionBar;
    if (info.current) {
      bar.nameEl.textContent = info.current.name;
      const pct = Math.max(0, Math.min(1, info.current.progress || 0)) * 100;
      bar.fillEl.style.width = pct + '%';
      bar.root.classList.add('active');
      if (info.current.combat) bar.root.classList.add('combat');
      else bar.root.classList.remove('combat');
    } else {
      bar.nameEl.textContent = '空闲';
      bar.fillEl.style.width = '0%';
      bar.root.classList.remove('active');
      bar.root.classList.remove('combat');
    }
  }

  function updateNavActive() {
    const a = api(); const idx = a.queries.navigation().activeIndex;
    if (idx === navState.lastIndex) return;
    navState.lastIndex = idx;
    for (let i = 0; i < shell.nav.items.length; i++) {
      shell.nav.items[i].classList.toggle('active', i === idx);
    }
    contentState.key = null; // 切页强制重建内容
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
        showToast('当前操作暂不可用');
        return null;
      }
      result = input === undefined
        ? a.commands[name]()
        : a.commands[name](input);
      if (result && result.message) showToast(result.message);
    } catch (error) {
      showToast('操作未完成，请稍后重试');
    }
    renderGame();
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
    c.classList.add(pageClass);
    const refs = contentState.refs;
    const head = el('div', 'skill-head card', c);
    refs.skillTitle = el(
      'div',
      'card-title',
      head,
      info.title + ' Lv.' + (info.level == null ? info.lv : info.level)
    );
    const xpBar = el('div', 'xp-bar', head);
    refs.skillXpFill = el('div', 'xp-fill', xpBar);
    refs.skillXpText = el('div', 'xp-text', xpBar);
    el('div', 'desc', head, info.description || info.desc || '');
    refs.skillBonus = el('div', 'bonus-line', head, '');
    updateSkillHead(info);
  }

  function updateSkillHead(info) {
    const refs = contentState.refs;
    if (!refs.skillTitle) return;
    const level = info.level == null ? info.lv : info.level;
    const nextXp = info.nextXp == null ? info.xpNeed : info.nextXp;
    refs.skillTitle.textContent = info.title + ' Lv.' + level;
    refs.skillXpFill.style.width =
      percent(info.xp / (nextXp || 1)) + '%';
    refs.skillXpText.textContent = info.xp + '/' + nextXp;
  }

  function addProgress(card, action) {
    const progress = el('div', 'action-progress', card);
    const fill = el('div', 'fill', progress);
    const stalled = el('div', 'action-stalled', progress);
    const refs = { cardEl: card, fillEl: fill, stalledEl: stalled };
    updateProgress(refs, action);
    return refs;
  }

  function updateProgress(refs, action) {
    refs.cardEl.classList.toggle('active', !!action.active);
    refs.fillEl.style.width = percent(action.progress) + '%';
    refs.stalledEl.textContent = action.stalled ? '行动停滞' : '';
  }

  function updateActionControl(holder, action, disabled) {
    const mode = action.active ? 'stop' : 'start';
    const isDisabled = !action.active && !!disabled;
    holder._action = action;
    if (holder._mode === mode && holder._button) {
      holder._disabled = isDisabled;
      holder._button.disabled = isDisabled;
      return;
    }
    holder._mode = mode;
    holder._disabled = isDisabled;
    holder.innerHTML = '';
    const button = el(
      'button',
      'card-action ' + (action.active ? 'action-stop' : 'action-start'),
      holder,
      action.active ? '停止当前行动' : '开始'
    );
    button.disabled = isDisabled;
    holder._button = button;
    button.addEventListener('click', function () {
      const current = holder._action;
      if (current.active) invokeCommand('stopAction');
      else invokeCommand('startAction', { key: current.actionKey });
    });
  }

  function updateContent() {
    const a = api(); if (!a) return;
    const navigation = a.queries.navigation();
    const active = navigation.items[navigation.activeIndex];
    const navName = active ? active.label : '洞府';
    let key = 'placeholder:' + navName;
    if (navName === '洞府') key = 'home';
    else if (navName === '背包') key = 'inventory';
    else if (navName === '事件') key = 'events';
    else if (navName === '关系') key = 'relationship';
    else if (navName === '宗门') key = 'sects';
    else if (navName === '天下') key = 'world';
    else if (navName === '战斗') key = 'combat';
    else if (navName === '功法') key = 'techniques';
    else if (GATHER_NAV.indexOf(navName) >= 0) key = 'gather:' + navName;
    else if (PRODUCTION_NAV.indexOf(navName) >= 0) {
      key = 'production:' + navName;
    }
    if (key !== contentState.key) {
      rebuildContent(navName);
      contentState.key = key;
    }
    if (key === 'home') liveHome();
    else if (key === 'inventory') liveInventory();
    else if (key === 'events') liveEvents();
    else if (key === 'relationship') liveRelationship();
    else if (key === 'sects') liveSects();
    else if (key === 'world') liveWorld();
    else if (key === 'combat') liveCombat();
    else if (key === 'techniques') liveTechniques();
    else if (key.indexOf('production:') === 0) liveProduction(navName);
    else if (key.indexOf('gather:') === 0) liveGather(navName);
  }

  function rebuildContent(navName) {
    hideItemTip();
    hideEquipmentTip();
    const c = shell.content;
    c.innerHTML = '';
    c.className = 'content';
    contentState.refs = {};
    if (navName === '洞府') buildHome(c);
    else if (navName === '背包') buildInventory(c);
    else if (navName === '事件') buildEvents(c);
    else if (navName === '关系') buildRelationship(c);
    else if (navName === '宗门') buildSects(c);
    else if (navName === '天下') buildWorld(c);
    else if (navName === '战斗') buildCombat(c);
    else if (navName === '功法') buildTechniques(c);
    else if (GATHER_NAV.indexOf(navName) >= 0) buildGather(navName, c);
    else if (PRODUCTION_NAV.indexOf(navName) >= 0) {
      buildProduction(navName, c);
    } else buildPlaceholder(navName, c);
  }

  function buildHome(c) {
    const refs = contentState.refs;
    // 洞府主页：先展示 5 张卡片（灵田/阵法/灵兽/会客厅/传承殿），点卡片进入对应子页。
    // 不再用页签切换（旧页签式已按功能细化规范清理）。
    refs.caveTab = 'grid';
    refs.caveHost = el('div', 'cave-module', c);
    renderCaveModule();
  }

  function liveHome() {
    // 洞府页不再显示境界与当前行动（按规范：移至顶部资源栏下方全局行动栏）。
    liveCaveModule();
  }

  function renderCaveModule() {
    const refs = contentState.refs;
    if (!refs.caveHost) return;
    refs.caveHost.innerHTML = '';
    if (refs.caveTab === 'grid') {
      buildCaveGrid(refs.caveHost);
      return;
    }
    // 子页：返回按钮 + 对应模块内容
    const back = el('button', 'cave-back', refs.caveHost, '← 返回洞府');
    back.addEventListener('click', function () {
      refs.caveTab = 'grid';
      farmUiState.selectedPlotId = null;
      renderCaveModule();
      syncFarmPlotModal();
    });
    const host = el('div', 'cave-sub', refs.caveHost);
    if (refs.caveTab === 'farm') buildFarm(host);
    else if (refs.caveTab === 'formations') buildFormations(host);
    else if (refs.caveTab === 'beasts') buildBeasts(host);
    else if (refs.caveTab === 'meetingHall') {
      buildReserve(host, 'reserve-meetingHall', '会客厅', '将在人物与事件阶段开放');
    } else {
      buildInheritanceHall(host);
    }
  }

  function buildCaveGrid(c) {
    const refs = contentState.refs;
    const grid = el('div', 'cave-grid', c);
    CAVE_TABS.forEach(function (entry) {
      const card = el('div', 'cave-card', grid, '');
      el('div', 'cave-card-title', card, entry[1]);
      card.addEventListener('click', function () {
        refs.caveTab = entry[0];
        if (entry[0] !== 'farm') farmUiState.selectedPlotId = null;
        renderCaveModule();
        syncFarmPlotModal();
      });
    });
  }

  function liveCaveModule() {
    const refs = contentState.refs;
    if (refs.caveTab === 'farm') liveFarm();
    else if (refs.caveTab === 'formations') liveFormations();
    else if (refs.caveTab === 'beasts') liveBeasts();
    else if (refs.caveTab === 'inheritance') liveInheritanceHall();
  }

  function farmStructure(view) {
    if (!view || !Array.isArray(view.plots) ||
        !Array.isArray(view.plantableCrops)) return 'unavailable';
    return JSON.stringify({
      plots: view.plots.map(function (plot) {
        return [plot.plotId, plot.unlocked, plot.cropId, plot.ready];
      }),
      crops: view.plantableCrops.map(function (crop) {
        return [crop.cropId, crop.unlocked, crop.seedOwned];
      })
    });
  }

  function farmUnlockedCrops(view) {
    return view.plantableCrops.filter(function (crop) {
      return crop.unlocked;
    });
  }

  function farmCropById(view, cropId) {
    return view.plantableCrops.find(function (crop) {
      return crop.cropId === cropId;
    }) || null;
  }

  function farmCssToken(value) {
    return String(value || 'none').replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  function farmCropKindClass(cropId) {
    return 'crop-kind-' + farmCssToken(cropId);
  }

  function farmPlotState(plot) {
    if (!plot.unlocked) return 'locked';
    if (!plot.cropId) return 'empty';
    return plot.ready ? 'ready' : 'growing';
  }

  function farmVisualCropId(view, plot, crops) {
    if (plot.cropId) return plot.cropId;
    if (!plot.unlocked) return '';
    return farmSelectedCropId(plot.plotId, crops);
  }

  function farmVisualCropName(view, plot, cropId) {
    if (plot.cropId) {
      return plot.cropName || (farmCropById(view, cropId) || {}).name || '灵植';
    }
    const crop = farmCropById(view, cropId);
    return crop ? crop.name : '待播种';
  }

  function farmCropIcon(cropId) {
    const icons = {
      spiritRice: '🌾',
      qiGatheringGrass: '🌿',
      heartClearGrass: '🌿',
      moonSpiritGrass: '🌿',
      bloodSpiritGrass: '🌿',
      goldenLingzhi: '🍄'
    };
    return icons[cropId] || '🌱';
  }

  function farmSeedIcon(seedItemId) {
    const icons = {
      commonSeed: '🌱',
      fineSeed: '🌱',
      rareSeed: '🌟'
    };
    return icons[seedItemId] || '🌱';
  }

  function farmFieldIcon(view, plot, cropId) {
    if (!plot.unlocked) return '·';
    if (plot.cropId) return farmCropIcon(cropId);
    const crop = farmCropById(view, cropId);
    return crop ? farmSeedIcon(crop.seedItemId) : '未选择种子';
  }

  function fmtDurShort(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) return d + ' 天 ' + h + ' 小时';
    if (h > 0) return h + ' 小时 ' + m + ' 分';
    if (m > 0) return m + ' 分 ' + s + ' 秒';
    return s + ' 秒';
  }

  function farmFieldStatus(view, plot, cropId) {
    if (!plot.unlocked) return '尚未解锁';
    if (plot.cropId) {
      return plot.ready ? '已成熟' : '成长中';
    }
    return '未播种';
  }

  function farmProgressLabel(plot) {
    if (plot.ready) return '已成熟';
    return '剩余 ' + fmtDurShort(plot.remainingSeconds);
  }

  function farmFieldProgress(plot) {
    if (!plot.unlocked) return 0;
    if (!plot.cropId) return 0;
    if (plot.ready) return 1;
    return plot.progress;
  }

  function buildFarmField(parent, view, plot, crops) {
    const cropId = farmVisualCropId(view, plot, crops);
    const cropClass = farmCropKindClass(cropId);
    parent.classList.add('farm-field');
    parent.classList.add('field-state-' + farmPlotState(plot));
    parent.classList.add(cropClass);
    const unselectedClass = plot.unlocked && !plot.cropId && !cropId
      ? ' farm-seed-unselected'
      : '';
    el(
      'div',
      'farm-crop-icon ' + cropClass + unselectedClass,
      parent,
      farmFieldIcon(view, plot, cropId)
    );
    const ref = {
      statusEl: el(
        'div',
        'farm-field-status',
        parent,
        farmFieldStatus(view, plot, cropId)
      )
    };
    if (plot.cropId) {
      const progress = el('div', 'farm-field-progress', parent);
      ref.fillEl = el('div', 'farm-field-progress-fill', progress);
      ref.progressLabelEl = el(
        'div',
        'farm-field-progress-label',
        progress,
        farmProgressLabel(plot)
      );
      ref.fillEl.style.width = percent(farmFieldProgress(plot)) + '%';
    }
    return ref;
  }

  function farmEmptyPlots(view) {
    return view.plots.filter(function (plot) {
      return plot.unlocked && !plot.cropId;
    });
  }

  function farmSelectedCropId(plotId, crops) {
    const current = cropSelections[plotId];
    return crops.some(function (crop) {
      return crop.cropId === current;
    }) ? current : '';
  }

  function setFarmCropSelection(plotId, cropId, crops) {
    if (crops.some(function (crop) {
      return crop.cropId === cropId;
    })) {
      cropSelections[plotId] = cropId;
    } else {
      delete cropSelections[plotId];
    }
  }

  function farmPlannedAssignments(view) {
    const crops = farmUnlockedCrops(view);
    return farmEmptyPlots(view).map(function (plot) {
      return {
        plotId: plot.plotId,
        cropId: farmSelectedCropId(plot.plotId, crops)
      };
    }).filter(function (assignment) {
      return !!assignment.cropId;
    });
  }

  function farmPlanStatus(view, assignments) {
    const available = {};
    const needed = {};
    assignments.forEach(function (assignment) {
      const crop = farmCropById(view, assignment.cropId);
      if (!crop) return;
      available[crop.seedItemId] = crop.seedOwned;
      needed[crop.seedItemId] =
        (needed[crop.seedItemId] || 0) + crop.seedRequired;
    });
    const missing = Object.keys(needed).some(function (itemId) {
      return needed[itemId] > (available[itemId] || 0);
    });
    return {
      ok: !missing,
      warning: missing ? '种子不足' : '',
      text: assignments.length
        ? missing
          ? '将播种 ' + assignments.length + ' 块 · 种子不足'
          : '将播种 ' + assignments.length + ' 块'
        : farmEmptyPlots(view).length
          ? '尚未选择种子'
          : '没有空闲灵田'
    };
  }

  function openFarmPlotModal(plotId) {
    farmUiState.selectedPlotId = plotId;
    renderCaveModule();
    syncFarmPlotModal();
  }

  function closeFarmPlotModal() {
    farmUiState.selectedPlotId = null;
    renderCaveModule();
    syncFarmPlotModal();
  }

  function buildFarm(c) {
    const view = api().queries.homestead('farm');
    const refs = contentState.refs;
    if (!view || !Array.isArray(view.plots) ||
        !Array.isArray(view.plantableCrops)) {
      refs.caveStructure = 'unavailable';
      buildReserve(c, 'reserve-farm', '灵田', '当前存档尚未启用灵田');
      return;
    }
    refs.caveStructure = farmStructure(view);
    refs.plotRefs = {};
    const crops = farmUnlockedCrops(view);
    const assignments = farmPlannedAssignments(view);
    const planStatus = farmPlanStatus(view, assignments);

    if (farmUiState.selectedPlotId &&
        !view.plots.some(function (plot) {
          return plot.plotId === farmUiState.selectedPlotId;
        })) {
      farmUiState.selectedPlotId = null;
    }
    if (!crops.some(function (crop) {
      return crop.cropId === farmUiState.quickCropId;
    })) {
      farmUiState.quickCropId = crops[0] && crops[0].cropId || '';
    }

    const toolbar = el('div', 'farm-toolbar', c);
    const quick = el('select', 'crop-select quick-crop-select', toolbar);
    crops.forEach(function (crop) {
      const option = el('option', '', quick, crop.name);
      option.value = crop.cropId;
    });
    quick.value = farmUiState.quickCropId;
    quick.disabled = !crops.length;
    quick.addEventListener('change', function (event) {
      farmUiState.quickCropId = event.target.value;
    });
    const quickButton = el(
      'button',
      'farm-toolbtn quick-seed-action',
      toolbar,
      '快捷播种'
    );
    quickButton.disabled = !farmEmptyPlots(view).length || !crops.length;
    quickButton.addEventListener('click', function () {
      farmEmptyPlots(view).forEach(function (plot) {
        setFarmCropSelection(plot.plotId, farmUiState.quickCropId, crops);
      });
      renderCaveModule();
      syncFarmPlotModal();
    });
    const plantAll = el(
      'button',
      'farm-toolbtn primary plant-all-action',
      toolbar,
      '全部播种'
    );
    plantAll.disabled = !assignments.length;
    plantAll.addEventListener('click', function () {
      if (!planStatus.ok) {
        showToast(planStatus.warning || planStatus.text);
        return;
      }
      const result = invokeCommand('plantAll', { assignments: assignments });
      if (result && result.ok && result.changed) {
        farmUiState.selectedPlotId = null;
        renderCaveModule();
        syncFarmPlotModal();
      }
    });
    el('div', 'farm-plan-summary', c, planStatus.text);

    const grid = el('div', 'homestead-grid', c);
    view.plots.forEach(function (plot) {
      const card = el(
        'div',
        'card plot-card' +
          (plot.unlocked ? '' : ' locked') +
          (farmUiState.selectedPlotId === plot.plotId ? ' selected' : ''),
        grid
      );
      card.addEventListener('click', function () {
        openFarmPlotModal(plot.plotId);
      });
      const fieldRef = buildFarmField(card, view, plot, crops);
      if (!plot.unlocked) {
        return;
      }
      if (!plot.cropId) {
        return;
      }
      refs.plotRefs[plot.plotId] = fieldRef;
      updatePlot(refs.plotRefs[plot.plotId], plot);
    });
  }

  function farmSelectedPlotContext() {
    if (!contentState.refs || contentState.refs.caveTab !== 'farm') {
      return null;
    }
    if (!farmUiState.selectedPlotId) return null;
    const view = api().queries.homestead('farm');
    if (!view || !Array.isArray(view.plots) ||
        !Array.isArray(view.plantableCrops)) {
      return null;
    }
    const plot = view.plots.find(function (entry) {
      return entry.plotId === farmUiState.selectedPlotId;
    });
    if (!plot) {
      farmUiState.selectedPlotId = null;
      return null;
    }
    return {
      view: view,
      plot: plot,
      crops: farmUnlockedCrops(view)
    };
  }

  function farmPlotModalSignature(view, plot, crops) {
    const cropId = farmVisualCropId(view, plot, crops);
    return JSON.stringify({
      plot: [
        plot.plotId,
        plot.unlocked,
        plot.cropId,
        plot.cropName,
        plot.ready,
        cropId
      ],
      crops: crops.map(function (crop) {
        return [
          crop.cropId,
          crop.name,
          crop.seedOwned,
          crop.seedRequired,
          crop.growthSeconds,
          crop.baseHarvest,
          crop.masteryLevel
        ];
      })
    });
  }

  function buildFarmPlotModal(m) {
    m.root.addEventListener('click', function (event) {
      if (event && event.target === m.root) closeFarmPlotModal();
    });
    const modal = el('div', 'modal farm-plot-modal', m.root);
    const close = el('button', 'modal-close', modal, '×');
    close.addEventListener('click', function () {
      closeFarmPlotModal();
    });
    m.refs = {
      title: el('div', 'modal-title', modal, '灵田详情'),
      body: el('div', 'modal-body farm-plot-modal-body', modal)
    };
    m.signature = '';
  }

  function updateFarmPlotModal(m, view, plot, crops) {
    m.refs.title.textContent = '灵田详情';
    const signature = farmPlotModalSignature(view, plot, crops);
    if (m.signature !== signature) {
      m.refs.body.innerHTML = '';
      buildFarmPlotDetail(m.refs.body, view, plot, crops);
      m.signature = signature;
      return;
    }
    updatePlot(contentState.refs.plotRefs['detail-' + plot.plotId], plot);
  }

  function syncFarmPlotModal() {
    const m = modals.farmPlot;
    if (!m || !m.root) return;
    const context = farmSelectedPlotContext();
    if (!context) {
      m.root.style.display = 'none';
      m.signature = '';
      return;
    }
    if (!m.built) {
      buildFarmPlotModal(m);
      m.built = true;
    }
    m.root.style.display = 'flex';
    updateFarmPlotModal(m, context.view, context.plot, context.crops);
  }

  function buildFarmPlotDetail(c, view, plot, crops) {
    const preview = el('div', 'farm-modal-field-preview', c);
    buildFarmField(preview, view, plot, crops);
    if (!plot.unlocked) {
      el('div', 'muted', c, '尚未解锁');
      return;
    }
    if (!plot.cropId) {
      const selectedCropId = farmSelectedCropId(plot.plotId, crops);
      el(
        'div',
        'plot-status',
        c,
        selectedCropId
          ? '未播种 · 这块田会按当前种子计划参与全部播种'
          : '未播种 · 尚未选择种子'
      );
      const select = el('select', 'crop-select crop-plan-select', c);
      const placeholder = el('option', '', select, '未选择种子');
      placeholder.value = '';
      crops.forEach(function (crop) {
        const option = el('option', '', select, crop.name);
        option.value = crop.cropId;
      });
      select.value = selectedCropId;
      select.disabled = !crops.length;
      select.addEventListener('change', function (event) {
        setFarmCropSelection(plot.plotId, event.target.value, crops);
        renderCaveModule();
        syncFarmPlotModal();
      });
      const crop = farmCropById(view, selectedCropId);
      if (crop) {
        const stats = el('div', 'farm-detail-grid', c);
        el('div', 'seed-count', stats, '种子 ' + crop.seedOwned + '/' + crop.seedRequired);
        el('div', 'muted', stats, '成长 ' + fmtDur(crop.growthSeconds));
        el('div', 'muted', stats, '基础产出 ' + crop.baseHarvest);
        el('div', 'muted', stats, '精通 ' + crop.masteryLevel + ' 级');
      } else {
        el('div', 'muted', c, '暂无可种作物');
      }
      return;
    }
    el('div', 'plot-crop', c, plot.cropName);
    const progress = el('div', 'action-progress', c);
    const fill = el('div', 'fill', progress);
    const status = el('div', 'plot-status', c);
    const ref = { fillEl: fill, statusEl: status };
    contentState.refs.plotRefs['detail-' + plot.plotId] = ref;
    updatePlot(ref, plot);
    if (plot.ready) {
      const harvest = el(
        'button',
        'small-btn harvest-action',
        c,
        '采收'
      );
      harvest.addEventListener('click', function (event) {
        if (event && event.stopPropagation) event.stopPropagation();
        invokeCommand('harvest', { plotId: plot.plotId });
      });
    }
  }

  function updatePlot(ref, plot) {
    if (!ref) return;
    if (ref.fillEl) {
      ref.fillEl.style.width = percent(farmFieldProgress(plot)) + '%';
    }
    if (ref.progressLabelEl) {
      ref.progressLabelEl.textContent = farmProgressLabel(plot);
    }
    if (ref.statusEl) {
      ref.statusEl.textContent = plot.ready ? '已成熟' : '成长中';
    }
  }

  function liveFarm() {
    const view = api().queries.homestead('farm');
    if (!view || !Array.isArray(view.plots) ||
        !Array.isArray(view.plantableCrops)) return;
    if (contentState.refs.caveStructure !== farmStructure(view)) {
      renderCaveModule();
      return;
    }
    view.plots.forEach(function (plot) {
      updatePlot(contentState.refs.plotRefs[plot.plotId], plot);
      updatePlot(contentState.refs.plotRefs['detail-' + plot.plotId], plot);
    });
  }

  function formationStructure(view) {
    if (!view || !Array.isArray(view.slots) ||
        !Array.isArray(view.formations)) return 'unavailable';
    return JSON.stringify({
      slots: view.slots,
      formations: view.formations
    });
  }

  function buildFormations(c) {
    const view = api().queries.homestead('formations');
    const refs = contentState.refs;
    if (!view || !Array.isArray(view.slots) ||
        !Array.isArray(view.formations)) {
      refs.caveStructure = 'unavailable';
      buildReserve(c, 'reserve-formations', '阵法', '当前存档尚未启用阵法');
      return;
    }
    refs.caveStructure = formationStructure(view);
    view.slots.forEach(function (slot) {
      const card = el('div', 'card formation-slot', c);
      el('div', 'card-title', card, '阵位 ' + (slot.slotIndex + 1));
      el('div', 'formation-name', card, slot.name || '未布阵');
      if (slot.effectText) el('div', 'effect-text', card, slot.effectText);
      if (slot.formationId) {
        const clear = el(
          'button',
          'small-btn formation-clear',
          card,
          '卸下'
        );
        clear.addEventListener('click', function () {
          invokeCommand('unequipFormation', {
            slotIndex: slot.slotIndex
          });
        });
      }
    });
    const list = el('div', 'formation-list', c);
    view.formations.forEach(function (formation) {
      const row = el('div', 'card formation-card', list);
      el('div', 'card-title', row, formation.name);
      const owned = el(
        'div',
        'formation-owned',
        row,
        '持有 ' + formation.owned + ' · 可用 ' + formation.unbound
      );
      attachItemTipTrigger(owned, {
        itemId: formation.itemId,
        name: formation.name,
        owned: formation.owned,
        available: formation.unbound
      });
      el(
        'div',
        'formation-discovered',
        row,
        formation.discovered ? '已发现' : '尚未发现'
      );
      el('div', 'effect-text', row, formation.effectText);
      if (formation.canEquip) {
        const equip = el(
          'button',
          'small-btn formation-equip',
          row,
          view.slots[0] && view.slots[0].formationId ? '替换' : '装备'
        );
        equip.addEventListener('click', function () {
          invokeCommand('equipFormation', {
            slotIndex: 0,
            itemId: formation.itemId
          });
        });
      }
    });
  }

  function liveFormations() {
    const view = api().queries.homestead('formations');
    if (!view || !Array.isArray(view.slots) ||
        !Array.isArray(view.formations)) return;
    if (contentState.refs.caveStructure !== formationStructure(view)) {
      renderCaveModule();
    }
  }

  function beastStructure(view) {
    if (!view || !Array.isArray(view.encounters) ||
        !Array.isArray(view.roster)) return 'unavailable';
    return JSON.stringify({
      encounters: view.encounters.map(function (encounter) {
        return [
          encounter.id,
          encounter.speciesName,
          encounter.sourceSkillId,
          encounter.tame.actionKey,
          encounter.tame.itemId,
          encounter.tame.durationSeconds,
          encounter.tame.active,
          encounter.tame.stalled
        ];
      }),
      roster: view.roster.map(function (beast) {
        return [
          beast.id,
          beast.level,
          beast.xp,
          beast.traitName,
          beast.growthName,
          beast.training.actionKey,
          beast.training.itemId,
          beast.training.durationSeconds,
          beast.assistant.beastId,
          beast.assistant.effect,
          beast.assistant.active,
          beast.training.active,
          beast.training.stalled
        ];
      })
    });
  }

  function buildBeasts(c) {
    const view = api().queries.homestead('beasts');
    const refs = contentState.refs;
    if (!view || !Array.isArray(view.encounters) ||
        !Array.isArray(view.roster)) {
      refs.caveStructure = 'unavailable';
      buildReserve(c, 'reserve-beasts', '灵兽', '当前存档尚未启用灵兽');
      return;
    }
    refs.caveStructure = beastStructure(view);
    refs.beastActions = {};
    if (!view.encounters.length) {
      el('div', 'muted', c, '暂无待驯服灵兽');
    }
    view.encounters.forEach(function (encounter) {
      const card = el('div', 'card beast-card beast-encounter', c);
      el('div', 'card-title', card, encounter.speciesName);
      el('div', 'action-meta', card, '来自 ' + encounter.sourceSkillId);
      el(
        'div',
        'action-meta',
        card,
        ''
      );
      const tameMeta = card.lastChild;
      const tameItem = encounter.tame.itemId
        ? resolveItemTipData({ itemId: encounter.tame.itemId, required: 1 })
        : null;
      if (tameItem) {
        renderItemLine(
          tameMeta,
          tameItem,
          '驯服耗时 ' + encounter.tame.durationSeconds + ' 秒 · 材料 ' +
            tameItem.name
        );
      } else {
        tameMeta.textContent =
          '驯服耗时 ' + encounter.tame.durationSeconds + ' 秒';
      }
      const action = Object.assign({}, encounter.tame);
      const progress = addProgress(card, action);
      const holder = el('div', 'action-control', card);
      updateActionControl(holder, action, false);
      refs.beastActions[action.actionKey] = { progress, holder };
    });
    view.roster.forEach(function (beast) {
      const card = el('div', 'card beast-card beast-roster', c);
      el(
        'div',
        'card-title',
        card,
        beast.speciesName + ' Lv.' + beast.level
      );
      el(
        'div',
        'beast-detail',
        card,
        '经验 ' + beast.xp + ' · 特性 ' + beast.traitName +
          ' · 成长 ' + beast.growthName
      );
      el(
        'div',
        'action-meta',
        card,
        ''
      );
      const trainingMeta = card.lastChild;
      const trainingItem = beast.training.itemId
        ? resolveItemTipData({ itemId: beast.training.itemId, required: 1 })
        : null;
      if (trainingItem) {
        renderItemLine(
          trainingMeta,
          trainingItem,
          '训练耗时 ' + beast.training.durationSeconds + ' 秒 · 材料 ' +
            trainingItem.name
        );
      } else {
        trainingMeta.textContent =
          '训练耗时 ' + beast.training.durationSeconds + ' 秒';
      }
      const action = Object.assign({}, beast.training);
      const training = el('div', 'beast-training', card);
      const progress = addProgress(training, action);
      const holder = el('div', 'action-control', training);
      updateActionControl(holder, action, false);
      refs.beastActions[action.actionKey] = { progress, holder };
      const assistant = el(
        'button',
        'small-btn assistant-toggle',
        card,
        beast.assistant.active ? '取消助阵' : '设为助阵'
      );
      assistant.addEventListener('click', function () {
        invokeCommand('setActiveBeast', {
          beastId: beast.assistant.active ? null : beast.assistant.beastId
        });
      });
    });
  }

  function liveBeasts() {
    const view = api().queries.homestead('beasts');
    if (!view || !Array.isArray(view.encounters) ||
        !Array.isArray(view.roster)) return;
    if (contentState.refs.caveStructure !== beastStructure(view)) {
      renderCaveModule();
      return;
    }
    view.encounters.forEach(function (encounter) {
      const ref = contentState.refs.beastActions[encounter.tame.actionKey];
      if (ref) updateProgress(ref.progress, encounter.tame);
    });
    view.roster.forEach(function (beast) {
      const ref = contentState.refs.beastActions[beast.training.actionKey];
      if (ref) updateProgress(ref.progress, beast.training);
    });
  }

  function buildInventory(c) {
    const refs = contentState.refs;
    c.classList.add('inventory-page');
    refs.equipmentDock = el('section', 'inventory-equipment-dock', c);
    const dockHead = el('div', 'equipment-dock-head', refs.equipmentDock);
    el('div', 'equipment-dock-title', dockHead, '当前装备');
    refs.equipmentLoadoutName = el(
      'div',
      'equipment-dock-plan',
      dockHead,
      '当前战斗方案'
    );
    refs.equipmentDockGrid = el(
      'div',
      'equipment-dock-grid',
      refs.equipmentDock
    );
    refs.inventoryScroll = el('div', 'inventory-scroll-region', c);
    refs.filters = el('div', 'filters inv-filters', refs.inventoryScroll);
    enableDragScroll(refs.filters);
    refs.toolbar = el('div', 'inv-toolbar', refs.inventoryScroll);
    refs.capacity = el('div', 'inv-capacity', refs.toolbar);
    const btnGroup = el('div', 'inv-toolbtns', refs.toolbar);
    refs.tidyBtn = el('button', 'inv-toolbtn', btnGroup, '整理');
    refs.expandBtn = el('button', 'inv-toolbtn primary', btnGroup, '拓展');
    refs.tidyBtn.addEventListener('click', tidyInventory);
    refs.expandBtn.addEventListener('click', openExpandModal);
    refs.inventoryHost = el('div', 'inv-grid', refs.inventoryScroll);
    refreshInventoryView();
  }

  function uiQuality(quality) {
    return {
      common: 'white',
      fine: 'green',
      rare: 'blue',
      epic: 'purple',
      legendary: 'orange',
      mythic: 'red'
    }[quality] || quality || 'white';
  }

  function activeEquipmentPlan() {
    const view = safeQuery('combatLoadouts', undefined, null);
    if (!view || !Array.isArray(view.plans)) return null;
    return view.plans.find(function (plan) {
      return plan && plan.id === view.activeLoadoutId;
    }) || view.plans.find(function (plan) {
      return plan && plan.active;
    }) || view.plans[0] || null;
  }

  function equipmentInfo(itemLike) {
    const source = itemLike && typeof itemLike === 'object'
      ? itemLike
      : {};
    const instanceId = typeof source.instanceId === 'string'
      ? source.instanceId
      : '';
    if (!instanceId) return null;
    const detail = safeQuery(
      'equipmentInfo',
      { instanceId: instanceId },
      null
    );
    if (!detail) return Object.assign({}, source, {
      instanceId: instanceId,
      category: 'equipment'
    });
    const merged = Object.assign({}, source, detail, {
      instanceId: instanceId,
      itemId: instanceId,
      category: 'equipment',
      quantity: Number.isSafeInteger(source.quantity)
        ? source.quantity
        : 1,
      available: Number.isSafeInteger(source.available)
        ? source.available
        : 1,
      bound: Array.isArray(detail.references)
        ? detail.references.length
        : Number(source.bound) || 0,
      slotName: EQUIPMENT_LABELS[detail.slot] || detail.slot || '装备'
    });
    if (!merged.description) {
      merged.description = (merged.affixes || []).map(function (affix) {
        return affix.text;
      }).join(' · ') || '尚未生成附加词条。';
    }
    return merged;
  }

  function refreshEquipmentDock() {
    const refs = contentState.refs;
    if (!refs.equipmentDockGrid) return;
    const plan = activeEquipmentPlan();
    const rows = plan && Array.isArray(plan.equipment)
      ? plan.equipment
      : [];
    const bySlot = {};
    rows.forEach(function (row) {
      if (row && EQUIPMENT_SLOTS.indexOf(row.slot) >= 0) {
        bySlot[row.slot] = row;
      }
    });
    const signature = JSON.stringify({
      id: plan && plan.id,
      name: plan && plan.name,
      equipment: EQUIPMENT_SLOTS.map(function (slot) {
        return bySlot[slot] || null;
      })
    });
    if (refs.equipmentDockSignature === signature) return;
    refs.equipmentDockSignature = signature;
    refs.equipmentLoadoutName.textContent = plan
      ? (plan.name || '当前战斗方案')
      : '暂无战斗方案';
    refs.equipmentDockGrid.innerHTML = '';
    EQUIPMENT_SLOTS.forEach(function (slotName) {
      const row = bySlot[slotName] || {
        slot: slotName,
        unlocked: true,
        instanceId: null
      };
      const filled = !!row.instanceId;
      const unlocked = row.unlocked !== false;
      const slot = el(
        'button',
        'equipment-dock-slot ' +
          (filled ? 'filled' : unlocked ? 'empty' : 'locked'),
        refs.equipmentDockGrid
      );
      slot.type = 'button';
      slot.dataset.slot = slotName;
      if (filled) slot.classList.add('q-' + uiQuality(row.quality));
      const icon = el('div', 'equipment-dock-icon', slot);
      if (filled) {
        renderItemIcon(icon, row, { fallback: '◇' });
      } else {
        icon.textContent = unlocked ? '＋' : '🔒';
      }
      el(
        'div',
        'equipment-dock-label',
        slot,
        EQUIPMENT_LABELS[slotName] || slotName
      );
      if (filled && row.enhancementLevel > 0) {
        el(
          'span',
          'equipment-dock-level',
          slot,
          '+' + row.enhancementLevel
        );
      }
      if (filled) {
        slot.addEventListener('click', function (event) {
          if (event && event.stopPropagation) event.stopPropagation();
          showEquippedEquipmentTip(row, slot);
        });
      } else if (unlocked) {
        slot.addEventListener('click', function () {
          inventoryUiState.category = 'equipment';
          refreshInventoryView();
          if (refs.inventoryScroll && refs.inventoryScroll.scrollTo) {
            refs.inventoryScroll.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      }
    });
  }

  function refreshInventoryView() {
    const refs = contentState.refs;
    const view = api().queries.inventory({ category: inventoryUiState.category });
    inventoryUiState.category = view.selectedCategory;
    refs.capacity.textContent = '已用 ' + view.used + ' / ' + view.capacity;
    refreshEquipmentDock();

    // 顶部筛选页签（支持横向滑动）
    const filterSignature = view.categories.join(',') + '|' + view.selectedCategory;
    if (refs.filterSignature !== filterSignature) {
      refs.filterSignature = filterSignature;
      refs.filters.innerHTML = '';
      view.categories.forEach(function (category) {
        const chip = el(
          'button',
          'filter-chip' +
            (category === view.selectedCategory ? ' active' : ''),
          refs.filters,
          CATEGORY_LABELS[category] || category
        );
        chip.addEventListener('click', function () {
          inventoryUiState.category = category;
          refreshInventoryView();
        });
      });
    }

    // 物品列表（整理后按品质排序）
    let items = Array.isArray(view.items) ? view.items.slice() : [];
    if (inventoryUiState.sortMode === 'quality') {
      items.sort(function (left, right) {
        const q = (QUALITY_TIER[right.quality] || 0) - (QUALITY_TIER[left.quality] || 0);
        if (q !== 0) return q;
        const cat = (INV_CATEGORY_ORDER[right.category] || 0) -
          (INV_CATEGORY_ORDER[left.category] || 0);
        if (cat !== 0) return cat;
        return String(left.name).localeCompare(String(right.name), 'zh');
      });
    }

    // 标准 RPG 网格：固定 capacity 个格子，前 N 个放物品，其余为空槽
    const capacity = Math.max(0, Number(view.capacity) || 0);
    const signature = capacity + '|' + inventoryUiState.sortMode + '|' + JSON.stringify(items);
    if (refs.invSignature === signature) return;
    refs.invSignature = signature;
    refs.inventoryHost.innerHTML = '';
    for (let i = 0; i < capacity; i++) {
      const item = items[i];
      const slot = el(
        'div',
        'inv-slot' + (item ? ' filled' : ' empty'),
        refs.inventoryHost
      );
      if (!item) continue; // 空槽：纯展示，无内容、无图标
      if (item.quality) slot.classList.add('q-' + uiQuality(item.quality));
      renderItemIcon(el('div', 'inv-icon', slot), item);
      el('div', 'inv-slot-name', slot, item.name);
      if (item.favorite) {
        el('div', 'inv-favorite', slot, '★');
      }
      if (item.quantity > 1) {
        el('div', 'inv-qty', slot, '×' + item.quantity);
      }
      slot.addEventListener('click', function () {
        openInventoryItemAction(item);
      });
    }
  }

  function tidyInventory() {
    inventoryUiState.sortMode = 'quality';
    refreshInventoryView();
    showToast('背包已整理');
  }

  function liveInventory() {
    if (contentState.refs.inventoryHost) refreshInventoryView();
  }

  // ── 只读物品 tips：非背包场景使用，手机点击显示，点击外部隐藏 ──
  function resolveItemTipData(itemLike) {
    const source = itemLike && typeof itemLike === 'object' ? itemLike : {};
    const equipment = equipmentInfo(source);
    const itemId = typeof source.itemId === 'string' ? source.itemId : '';
    const meta = !equipment && itemId
      ? safeQuery('itemInfo', { itemId: itemId }, null)
      : null;
    const merged = Object.assign({
      itemId: itemId,
      name: itemId || '未知物品',
      category: 'material',
      icon: '📦',
      description: '暂无说明。',
      quality: 'white',
      sellValue: 0
    }, meta || {}, source, equipment || {});
    if (equipment) {
      merged.itemId = equipment.instanceId;
      merged.instanceId = equipment.instanceId;
      merged.category = 'equipment';
    }
    if (!merged.name) merged.name = itemId || '未知物品';
    if (!merged.icon) merged.icon = '📦';
    if (!merged.description) merged.description = '暂无说明。';
    if (!merged.quality) merged.quality = 'white';
    return merged;
  }

  function itemIconFallback(itemLike, fallback) {
    return itemLike && typeof itemLike.icon === 'string' && itemLike.icon
      ? itemLike.icon
      : fallback || '📦';
  }

  function itemIconSource(itemLike, preferLarge) {
    if (!itemLike || typeof itemLike !== 'object') return '';
    if (preferLarge && typeof itemLike.iconSrc100 === 'string' &&
        itemLike.iconSrc100) {
      return itemLike.iconSrc100;
    }
    return itemLike.iconSrc50 || itemLike.iconSrc || itemLike.iconSrc100 || '';
  }

  function renderItemIcon(host, itemLike, options) {
    if (!host) return;
    const opts = options || {};
    const fallback = itemIconFallback(itemLike, opts.fallback);
    const src = itemIconSource(itemLike, !!opts.large);
    host.innerHTML = '';
    host.classList.toggle('has-image-icon', !!src);
    if (!src) {
      host.textContent = fallback;
      return;
    }
    const img = document.createElement('img');
    img.className = 'item-icon-img';
    img.src = src;
    img.alt = itemLike && itemLike.name ? itemLike.name : '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', function () {
      host.classList.remove('has-image-icon');
      host.innerHTML = '';
      host.textContent = fallback;
    });
    host.appendChild(img);
  }

  function ensureItemTip() {
    if (itemTip.built) return itemTip;
    const host = root || document.body || null;
    const rootEl = el('div', 'item-tip', host);
    rootEl.style.display = 'none';
    const head = el('div', 'item-tip-head', rootEl);
    const icon = el('div', 'item-tip-icon', head);
    const title = el('div', 'item-tip-title', head);
    const name = el('div', 'item-tip-name', title);
    const quality = el('div', 'item-tip-quality', title);
    const meta = el('div', 'item-tip-meta', rootEl);
    const desc = el('div', 'item-tip-desc', rootEl);
    itemTip = {
      built: true,
      root: rootEl,
      refs: {
        icon: icon,
        name: name,
        quality: quality,
        meta: meta,
        desc: desc
      },
      open: false
    };
    document.addEventListener('click', function (event) {
      if (!itemTip.open) return;
      const target = event.target;
      if (itemTip.root && itemTip.root.contains &&
          itemTip.root.contains(target)) {
        return;
      }
      if (target && target.closest &&
          target.closest('[data-item-tip-trigger="1"]')) {
        return;
      }
      hideItemTip();
    });
    return itemTip;
  }

  function itemTipMetaText(item) {
    const parts = [CATEGORY_LABELS[item.category] || item.category || '物品'];
    if (Number.isSafeInteger(item.quantity)) {
      parts.push('数量 ' + item.quantity);
    }
    if (Number.isSafeInteger(item.count)) {
      parts.push('数量 ' + item.count);
    }
    if (Number.isSafeInteger(item.required)) {
      parts.push('需要 ' + item.required);
    }
    if (Number.isSafeInteger(item.owned)) {
      parts.push('持有 ' + item.owned);
    }
    if (Number.isSafeInteger(item.available)) {
      parts.push('可用 ' + item.available);
    }
    return parts.join(' · ');
  }

  function positionItemTip(tipRoot, anchorElement) {
    const viewportWidth = Math.max(0, Number(window.innerWidth) || 360);
    const viewportHeight = Math.max(0, Number(window.innerHeight) || 640);
    const rect = anchorElement && anchorElement.getBoundingClientRect
      ? anchorElement.getBoundingClientRect()
      : { left: 12, right: 12, top: 120, bottom: 120, width: 0, height: 0 };
    const margin = 10;
    const width = Math.min(260, Math.max(210, viewportWidth - 24));
    tipRoot.style.maxWidth = width + 'px';
    tipRoot.style.left = Math.max(12, Math.min(
      viewportWidth - width - 12,
      rect.left + (rect.width / 2) - (width / 2)
    )) + 'px';
    const below = rect.bottom + margin;
    const useBelow = below + 160 < viewportHeight || rect.top < 180;
    tipRoot.style.top = (useBelow
      ? below
      : Math.max(12, rect.top - 170 - margin)) + 'px';
  }

  function showItemTip(itemLike, anchorElement) {
    const data = resolveItemTipData(itemLike);
    if (!data.itemId && !data.name) return;
    const tip = ensureItemTip();
    renderItemIcon(tip.refs.icon, data);
    tip.refs.name.textContent = data.name || data.itemId || '未知物品';
    const quality = data.quality || 'white';
    const qualityClass = uiQuality(quality);
    tip.refs.quality.textContent = QUALITY_LABELS[quality] || '普通';
    tip.refs.quality.className = 'item-tip-quality q-' + qualityClass;
    tip.refs.meta.textContent = itemTipMetaText(data);
    tip.refs.desc.textContent = data.description || '暂无说明。';
    tip.root.style.display = 'block';
    tip.open = true;
    positionItemTip(tip.root, anchorElement);
  }

  function hideItemTip() {
    if (!itemTip || !itemTip.root) return;
    itemTip.root.style.display = 'none';
    itemTip.open = false;
  }

  function ensureEquipmentTip() {
    if (equipmentTip.built) return equipmentTip;
    const host = root || document.body || null;
    const rootEl = el(
      'div',
      'item-tip equipment-equipped-tip',
      host
    );
    rootEl.style.display = 'none';
    const head = el('div', 'item-tip-head', rootEl);
    const icon = el('div', 'item-tip-icon', head);
    const title = el('div', 'item-tip-title', head);
    const name = el('div', 'item-tip-name', title);
    const quality = el('div', 'item-tip-quality', title);
    const meta = el('div', 'item-tip-meta', rootEl);
    const desc = el('div', 'item-tip-desc', rootEl);
    const actions = el('div', 'equipment-tip-actions', rootEl);
    const detail = el(
      'button',
      'equipment-tip-button equipment-tip-detail',
      actions,
      '查看详情'
    );
    const unequip = el(
      'button',
      'equipment-tip-button equipment-tip-unequip',
      actions,
      '卸下'
    );
    equipmentTip = {
      built: true,
      root: rootEl,
      refs: {
        icon: icon,
        name: name,
        quality: quality,
        meta: meta,
        desc: desc,
        detail: detail,
        unequip: unequip
      },
      open: false,
      data: null
    };
    detail.addEventListener('click', function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      const data = equipmentTip.data;
      hideEquipmentTip();
      if (data) openItemDetail(data);
    });
    unequip.addEventListener('click', function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      const data = equipmentTip.data;
      hideEquipmentTip();
      if (!data) return;
      invokeCommand('unequipEquipment', { slot: data.slot });
    });
    document.addEventListener('click', function (event) {
      if (!equipmentTip.open) return;
      if (equipmentTip.root && equipmentTip.root.contains &&
          equipmentTip.root.contains(event.target)) {
        return;
      }
      hideEquipmentTip();
    });
    return equipmentTip;
  }

  function showEquippedEquipmentTip(itemLike, anchorElement) {
    hideItemTip();
    const data = equipmentInfo(itemLike);
    if (!data) return;
    const tip = ensureEquipmentTip();
    const qualityClass = uiQuality(data.quality);
    renderItemIcon(tip.refs.icon, data);
    tip.refs.name.textContent = data.name || data.baseName || '未知装备';
    tip.refs.quality.textContent =
      data.qualityName || QUALITY_LABELS[data.quality] || '普通';
    tip.refs.quality.className =
      'item-tip-quality q-' + qualityClass;
    tip.refs.meta.textContent =
      (EQUIPMENT_LABELS[data.slot] || data.slot || '装备') +
      (data.enhancementLevel > 0
        ? ' · 强化 +' + data.enhancementLevel
        : '');
    tip.refs.desc.textContent = (data.affixes || []).length
      ? data.affixes.slice(0, 3).map(function (affix) {
        return affix.text;
      }).join(' · ')
      : '暂无附加词条';
    tip.data = data;
    tip.root.style.display = 'block';
    tip.open = true;
    positionItemTip(tip.root, anchorElement);
  }

  function hideEquipmentTip() {
    if (!equipmentTip || !equipmentTip.root) return;
    equipmentTip.root.style.display = 'none';
    equipmentTip.open = false;
    equipmentTip.data = null;
  }

  function attachItemTipTrigger(element, itemLike) {
    if (!element || !itemLike || !itemLike.itemId) return;
    element._itemTipData = itemLike;
    element.dataset.itemTipTrigger = '1';
    element.classList.add('item-tip-trigger');
    if (element._itemTipBound) return;
    element._itemTipBound = true;
    element.addEventListener('click', function (event) {
      if (event && event.preventDefault) event.preventDefault();
      if (event && event.stopPropagation) event.stopPropagation();
      showItemTip(element._itemTipData, element);
    });
  }

  function openInventoryItemAction(item) {
    hideItemTip();
    hideEquipmentTip();
    openItemDetail(resolveItemTipData(item));
  }

  function renderItemLine(rowEl, item, text) {
    const display = item && item.itemId
      ? resolveItemTipData(item)
      : item;
    rowEl.innerHTML = '';
    rowEl.classList.add('item-line');
    if (display && display.itemId) rowEl.classList.add('item-tip-trigger');
    renderItemIcon(el('span', 'item-line-icon', rowEl), display);
    el('span', 'item-line-text', rowEl, text);
    if (display && display.itemId) attachItemTipTrigger(rowEl, display);
  }

  // ── 物品详情弹窗 ──
  function buildItemDetail(m) {
    const a = api();
    const modal = el('div', 'modal', m.root);
    const close = el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeItemDetail);
    const body = el('div', 'modal-body item-detail-body', modal);
    const head = el('div', 'item-detail-head', body);
    const iconBig = el('div', 'item-icon-big', head, '');
    const titleWrap = el('div', 'item-title-wrap', head);
    const nameEl = el('div', 'item-detail-name', titleWrap, '');
    const subEl = el('div', 'item-detail-sub', titleWrap, '');
    const qualityEl = el('div', 'item-quality', titleWrap, '');
    const descEl = el('div', 'item-desc', body, '');
    const metaEl = el('div', 'item-meta', body, '');
    const equipmentRoot = el(
      'div',
      'equipment-detail-content',
      body
    );
    equipmentRoot.style.display = 'none';
    const equipmentStats = el(
      'div',
      'equipment-stat-grid',
      equipmentRoot
    );
    const equipmentComparison = el(
      'div',
      'equipment-comparison',
      equipmentRoot
    );
    const equipmentAffixes = el(
      'div',
      'equipment-affix-list',
      equipmentRoot
    );
    const protectLabel = el(
      'label',
      'equipment-protect-option',
      equipmentRoot
    );
    const protectToggle = el('input', '', protectLabel);
    protectToggle.type = 'checkbox';
    el(
      'span',
      '',
      protectLabel,
      '使用护符，提高本次强化成功率'
    );
    const equipmentActions = el(
      'div',
      'equipment-action-grid',
      equipmentRoot
    );
    const equipBtn = el(
      'button',
      'item-btn use equipment-action-equip',
      equipmentActions,
      '装备'
    );
    const enhanceBtn = el(
      'button',
      'item-btn use equipment-action-enhance',
      equipmentActions,
      '强化'
    );
    const reforgeBtn = el(
      'button',
      'item-btn use equipment-action-reforge',
      equipmentActions,
      '重铸'
    );
    const favoriteBtn = el(
      'button',
      'item-btn equipment-action-favorite',
      equipmentActions,
      '收藏'
    );
    const sellEquipmentBtn = el(
      'button',
      'item-btn sell equipment-action-sell',
      equipmentActions,
      '出售'
    );
    const salvageBtn = el(
      'button',
      'item-btn sell equipment-action-salvage',
      equipmentActions,
      '分解'
    );
    const actions = el('div', 'item-actions', body);
    const sellBtn = el('button', 'item-btn sell', actions, '出售');
    const useBtn = el('button', 'item-btn use', actions, '使用');
    m.refs = {
      iconBig: iconBig,
      nameEl: nameEl,
      subEl: subEl,
      qualityEl: qualityEl,
      descEl: descEl,
      metaEl: metaEl,
      equipmentRoot: equipmentRoot,
      equipmentStats: equipmentStats,
      equipmentComparison: equipmentComparison,
      equipmentAffixes: equipmentAffixes,
      protectToggle: protectToggle,
      equipmentActions: equipmentActions,
      equipBtn: equipBtn,
      enhanceBtn: enhanceBtn,
      reforgeBtn: reforgeBtn,
      favoriteBtn: favoriteBtn,
      sellEquipmentBtn: sellEquipmentBtn,
      salvageBtn: salvageBtn,
      stackActions: actions,
      sellBtn: sellBtn,
      useBtn: useBtn
    };
  }

  function equipmentStatValue(stat, value, signed) {
    const percentStats = {
      critChance: true,
      critDamage: true,
      actionIntervalTicks: true,
      damageReduction: true,
      healingPower: true,
      healingTaken: true,
      shieldPower: true,
      controlAccuracy: true,
      controlResistance: true,
      ailmentPower: true,
      ailmentResistance: true
    };
    const numeric = Number(value) || 0;
    const formatted = percentStats[stat]
      ? Math.round(numeric * 1000) / 10 + '%'
      : String(Math.round(numeric * 100) / 100);
    if (!signed || numeric < 0 || formatted.charAt(0) === '-') {
      return formatted;
    }
    return '+' + formatted;
  }

  function setEquipmentActionState(button, enabled) {
    button.disabled = !enabled;
    button.classList.toggle('disabled', !enabled);
  }

  function refreshEquipmentDetail(instanceId) {
    const detail = equipmentInfo({ instanceId: instanceId });
    if (detail && modals.itemDetail &&
        modals.itemDetail.root.style.display !== 'none') {
      updateItemDetail(modals.itemDetail, detail);
    }
  }

  function equipmentAction(
    m,
    commandName,
    input,
    instanceId,
    closeOnSuccess
  ) {
    const result = invokeCommand(commandName, input);
    if (!result || !result.ok) return;
    if (closeOnSuccess) {
      closeItemDetail();
      return;
    }
    refreshEquipmentDetail(instanceId);
  }

  function updateEquipmentDetail(m, item) {
    const r = m.refs;
    const data = equipmentInfo(item) || item;
    const permissions = data.permissions || {};
    r.stackActions.style.display = 'none';
    r.equipmentRoot.style.display = 'flex';
    renderItemIcon(r.iconBig, data, { large: true });
    r.nameEl.textContent = data.name || data.baseName || '未知装备';
    r.subEl.textContent =
      (EQUIPMENT_LABELS[data.slot] || data.slot || '装备') +
      ' · ' + (data.realmBand || '未知境界');
    const quality = data.quality || 'common';
    r.qualityEl.textContent =
      data.qualityName || QUALITY_LABELS[quality] || '普通';
    r.qualityEl.className =
      'item-quality q-' + uiQuality(quality);
    r.descEl.textContent = data.description ||
      '随机词条装备，仅在战斗中生效。';
    r.metaEl.innerHTML = '';
    el(
      'div',
      'item-meta-row',
      r.metaEl,
      '强化 +' + (Number(data.enhancementLevel) || 0) +
        ' / +15 · 保底进度 ' + (Number(data.enhancementPity) || 0)
    );
    el(
      'div',
      'item-meta-row',
      r.metaEl,
      data.favorite ? '★ 已收藏' : '未收藏'
    );
    if (Array.isArray(data.references) && data.references.length) {
      el(
        'div',
        'item-meta-row',
        r.metaEl,
        '已装备于 ' + data.references.map(function (reference) {
          return reference.loadoutName || reference.loadoutId;
        }).join('、')
      );
    }

    r.equipmentStats.innerHTML = '';
    const stats = [];
    Object.keys(data.flat || {}).forEach(function (stat) {
      stats.push({
        stat: stat,
        value: data.flat[stat],
        percent: false
      });
    });
    Object.keys(data.percent || {}).forEach(function (stat) {
      stats.push({
        stat: stat,
        value: data.percent[stat],
        percent: true
      });
    });
    stats.forEach(function (entry) {
      const row = el('div', 'equipment-stat-row', r.equipmentStats);
      el(
        'span',
        'equipment-stat-name',
        row,
        COMBAT_STAT_LABELS[entry.stat] || entry.stat
      );
      el(
        'span',
        'equipment-stat-value',
        row,
        entry.percent
          ? '+' + (Math.round(entry.value * 1000) / 10) + '%'
          : equipmentStatValue(entry.stat, entry.value, true)
      );
    });

    r.equipmentComparison.innerHTML = '';
    const comparison = data.comparison || {};
    const comparisonRows = [];
    Object.keys(comparison.flat || {}).forEach(function (stat) {
      comparisonRows.push({
        stat: stat,
        value: comparison.flat[stat],
        percent: false
      });
    });
    Object.keys(comparison.percent || {}).forEach(function (stat) {
      comparisonRows.push({
        stat: stat,
        value: comparison.percent[stat],
        percent: true
      });
    });
    if (comparisonRows.length) {
      el(
        'div',
        'equipment-section-title',
        r.equipmentComparison,
        comparison.currentName
          ? '替换「' + comparison.currentName + '」后'
          : '装备后提升'
      );
      comparisonRows.forEach(function (entry) {
        const value = Number(entry.value) || 0;
        const row = el(
          'div',
          'equipment-comparison-row ' +
            (value >= 0 ? 'positive' : 'negative'),
          r.equipmentComparison
        );
        el(
          'span',
          '',
          row,
          COMBAT_STAT_LABELS[entry.stat] || entry.stat
        );
        el(
          'span',
          '',
          row,
          entry.percent
            ? equipmentStatValue(entry.stat, value, true)
            : equipmentStatValue(entry.stat, value, true)
        );
      });
    }

    r.equipmentAffixes.innerHTML = '';
    el(
      'div',
      'equipment-section-title',
      r.equipmentAffixes,
      '随机词条 · 点击一条可在重铸时锁定'
    );
    const affixes = Array.isArray(data.affixes) ? data.affixes : [];
    if (!affixes.length) {
      el(
        'div',
        'equipment-affix-empty',
        r.equipmentAffixes,
        '该品质没有附加词条'
      );
    }
    if (!Number.isSafeInteger(m.lockedAffixIndex) ||
        m.lockedAffixIndex >= affixes.length) {
      m.lockedAffixIndex = null;
    }
    affixes.forEach(function (affix, index) {
      const row = el(
        'button',
        'equipment-affix-row' +
          (m.lockedAffixIndex === index ? ' locked' : ''),
        r.equipmentAffixes
      );
      row.type = 'button';
      el('span', 'equipment-affix-tier', row, 'T' + affix.tier);
      el('span', 'equipment-affix-text', row, affix.text || affix.name);
      row.addEventListener('click', function () {
        m.lockedAffixIndex =
          m.lockedAffixIndex === index ? null : index;
        updateEquipmentDetail(m, data);
      });
    });

    const instanceId = data.instanceId;
    const equippedHere = Array.isArray(data.references) &&
      data.references.some(function (reference) {
        return reference.slot === data.slot;
      });
    r.equipBtn.textContent = equippedHere
      ? '已装备'
      : '装备到' + (EQUIPMENT_LABELS[data.slot] || '栏位');
    setEquipmentActionState(
      r.equipBtn,
      permissions.canEquip !== false && !equippedHere
    );
    r.equipBtn.onclick = function () {
      equipmentAction(
        m,
        'equipEquipment',
        { instanceId: instanceId },
        instanceId,
        false
      );
    };

    const nextLevel = (Number(data.enhancementLevel) || 0) + 1;
    const materialCost = Math.max(1, Math.ceil(nextLevel / 3));
    r.enhanceBtn.textContent =
      '强化 +' + nextLevel + '（铁矿×' + materialCost + '）';
    setEquipmentActionState(
      r.enhanceBtn,
      permissions.canEnhance !== false &&
        (Number(data.enhancementLevel) || 0) < 15
    );
    r.enhanceBtn.onclick = function () {
      equipmentAction(
        m,
        'enhanceEquipment',
        {
          instanceId: instanceId,
          useProtection: !!r.protectToggle.checked
        },
        instanceId,
        false
      );
    };

    r.reforgeBtn.textContent = m.lockedAffixIndex === null
      ? '重铸全部词条'
      : '锁定 1 条并重铸';
    setEquipmentActionState(
      r.reforgeBtn,
      permissions.canReforge !== false && affixes.length > 0
    );
    r.reforgeBtn.onclick = function () {
      const input = { instanceId: instanceId };
      if (m.lockedAffixIndex !== null) {
        input.lockedAffixIndex = m.lockedAffixIndex;
      }
      equipmentAction(
        m,
        'reforgeEquipment',
        input,
        instanceId,
        false
      );
    };

    r.favoriteBtn.textContent = data.favorite ? '取消收藏' : '收藏';
    setEquipmentActionState(r.favoriteBtn, true);
    r.favoriteBtn.onclick = function () {
      equipmentAction(
        m,
        'setEquipmentFavorite',
        { instanceId: instanceId, favorite: !data.favorite },
        instanceId,
        false
      );
    };

    r.sellEquipmentBtn.textContent = '出售装备';
    setEquipmentActionState(
      r.sellEquipmentBtn,
      permissions.canSell !== false
    );
    r.sellEquipmentBtn.onclick = function () {
      equipmentAction(
        m,
        'sellEquipment',
        { instanceId: instanceId },
        instanceId,
        true
      );
    };

    r.salvageBtn.textContent = '分解为铁矿';
    setEquipmentActionState(
      r.salvageBtn,
      permissions.canSalvage !== false
    );
    r.salvageBtn.onclick = function () {
      equipmentAction(
        m,
        'salvageEquipment',
        { instanceIds: [instanceId] },
        instanceId,
        true
      );
    };
  }

  function updateItemDetail(m, item) {
    const r = m.refs;
    if (item && item.instanceId) {
      updateEquipmentDetail(m, item);
      return;
    }
    m.lockedAffixIndex = null;
    r.stackActions.style.display = 'flex';
    r.equipmentRoot.style.display = 'none';
    renderItemIcon(r.iconBig, item, { large: true });
    r.nameEl.textContent = item.name;
    const catLabel = CATEGORY_LABELS[item.category] || item.category;
    r.subEl.textContent = item.sellValue > 0
      ? catLabel + ' · 售价 ' + item.sellValue + ' 灵石'
      : catLabel;
    const quality = item.quality || 'white';
    const qLabel = QUALITY_LABELS[quality] || '普通';
    r.qualityEl.textContent = qLabel;
    r.qualityEl.className = 'item-quality q-' + uiQuality(quality);
    r.descEl.textContent = item.description || '暂无说明。';
    r.metaEl.innerHTML = '';
    el(
      'div',
      'item-meta-row',
      r.metaEl,
      '持有 ' + item.quantity + ' · 可用 ' + item.available
    );
    el(
      'div',
      'item-meta-row',
      r.metaEl,
      item.bound > 0 ? '已绑定 ' + item.bound + ' 件' : '未绑定'
    );

    const canSell = item.sellValue > 0 && item.available > 0;
    r.sellBtn.disabled = !canSell;
    r.sellBtn.classList.toggle('disabled', !canSell);
    r.sellBtn.textContent = canSell
      ? ('出售 +' + item.sellValue + ' 灵石')
      : '不可出售';
    r.sellBtn.onclick = function () {
      if (!canSell) return;
      invokeCommand('sellItem', { itemId: item.itemId, quantity: 1 });
      closeItemDetail();
    };

    const useLabel =
      item.category === 'technique' ? '研读'
        : item.category === 'equipment' ? '装备'
          : item.category === 'consumable' ? '使用'
            : '使用';
    r.useBtn.textContent = useLabel;
    r.useBtn.onclick = function () {
      invokeCommand('useItem', { itemId: item.itemId, quantity: 1 });
      closeItemDetail();
    };
  }

  function openItemDetail(item) {
    const m = modals.itemDetail;
    if (!m.built) {
      buildItemDetail(m);
      m.built = true;
    }
    m.lockedAffixIndex = null;
    m.root.style.display = 'flex';
    updateItemDetail(m, item);
  }

  function closeItemDetail() {
    const m = modals.itemDetail;
    if (m) m.root.style.display = 'none';
  }

  // ── 背包横向拖动滑动（桌面/移动通用）──
  function enableDragScroll(container) {
    let down = false, startX = 0, startScroll = 0, moved = false;
    container.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return; // 仅左键/触摸
      down = true; moved = false;
      startX = e.clientX; startScroll = container.scrollLeft;
    });
    container.addEventListener('pointermove', function (e) {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      if (moved) container.scrollLeft = startScroll - dx;
    });
    function end() {
      if (!down) return;
      down = false;
      // 拖动结束后延迟复位，确保本次 click 仍被拦截（避免误触页签）
      if (moved) setTimeout(function () { moved = false; }, 0);
    }
    container.addEventListener('pointerup', end);
    container.addEventListener('pointerleave', end);
    container.addEventListener('pointercancel', end);
    // 仅当发生过拖动才吞掉 click；纯净点击照常派发给页签
    container.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
  }

  // ── 拓展背包弹窗 ──
  function buildExpandModal(m) {
    const modal = el('div', 'modal expand-modal', m.root);
    const close = el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeExpandModal);
    const body = el('div', 'modal-body', modal);
    el('div', 'modal-title', body, '拓展背包');
    m.refs = {
      capEl: el('div', 'expand-cap', body, ''),
      list: el('div', 'expand-list', body, '')
    };
    m.options = [
      { amount: 10, cost: 50 },
      { amount: 20, cost: 100 }
    ];
  }

  function updateExpandModal(m) {
    const a = api();
    const inv = a.queries.inventory({ category: 'all' });
    const top = a.queries.top();
    const lingshi = (top && top.pills && top.pills.lingshi) || 0;
    m.refs.capEl.textContent = '当前容量 ' + inv.capacity + ' 格';
    m.refs.list.innerHTML = '';
    m.options.forEach(function (opt) {
      const row = el('div', 'expand-row', m.refs.list);
      el('div', 'expand-info', row,
        '+' + opt.amount + ' 格 · 消耗 ' + opt.cost + ' 灵石');
      const btn = el('button', 'inv-toolbtn primary expand-do', row, '拓展');
      const affordable = lingshi >= opt.cost;
      btn.disabled = !affordable;
      btn.classList.toggle('disabled', !affordable);
      btn.addEventListener('click', function () {
        const res = a.commands.expandInventory({
          amount: opt.amount,
          cost: opt.cost
        });
        if (res && res.ok) {
          showToast('背包已拓展至 ' + (inv.capacity + opt.amount) + ' 格');
          updateExpandModal(m);
          refreshInventoryView();
        } else {
          showToast((res && res.message) || '拓展失败');
        }
      });
    });
  }

  function openExpandModal() {
    const m = modals.expand;
    if (!m.built) { buildExpandModal(m); m.built = true; }
    m.root.style.display = 'flex';
    updateExpandModal(m);
  }

  function closeExpandModal() {
    const m = modals.expand;
    if (m) m.root.style.display = 'none';
  }

  function productionTopology(info) {
    return JSON.stringify({
      skillId: info.skillId,
      recipes: info.recipes.map(function (recipe) {
        return {
          recipeId: recipe.recipeId,
          actionKey: recipe.actionKey,
          costs: recipe.costs.map(function (cost) {
            return cost.itemId;
          }),
          choices: recipe.choiceCosts.map(function (choice) {
            return choice.options.map(function (option) {
              return option.itemId;
            });
          }),
          outputId: recipe.output.itemId
        };
      })
    });
  }

  function productionBonusText(info) {
    return '技艺加速 ' + percentText(info.bonuses.skillSpeedBonus) +
      ' · 制作减时 ' +
      percentText(info.bonuses.craftingDurationReduction) +
      ' · 材料保留 ' +
      percentText(info.bonuses.materialRetentionChance);
  }

  function updateProductionCard(ref, recipe) {
    ref.cardEl.classList.toggle('locked', !recipe.unlocked);
    ref.titleEl.textContent = recipe.name;
    ref.metaEl.textContent = recipe.unlocked
      ? '耗时 ' + recipe.durationSeconds + ' 秒'
      : '需 Lv.' + recipe.unlockLevel + ' 解锁';
    recipe.costs.forEach(function (cost, index) {
      const row = ref.costRows[index];
      renderItemLine(
        row,
        cost,
        cost.name + ' ' + cost.owned + '/' + cost.required
      );
      row.classList.toggle('missing', !cost.available);
    });
    recipe.choiceCosts.forEach(function (choice, choiceIndex) {
      choice.options.forEach(function (cost, optionIndex) {
        const row = ref.choiceRows[choiceIndex][optionIndex];
        renderItemLine(
          row,
          cost,
          cost.name + ' ' + cost.owned + '/' + cost.required
        );
        row.classList.toggle('missing', !cost.available);
      });
    });
    renderItemLine(
      ref.outputEl,
      recipe.output,
      '产出 ' + recipe.output.name + ' ×' + recipe.output.quantity
    );
    ref.masteryEl.textContent =
      '熟练 Lv.' + recipe.mastery.level + ' ' +
      recipe.mastery.xp + '/' + recipe.mastery.nextXp +
      ' · 加速 ' + percentText(recipe.mastery.speedBonus) +
      ' · 效果 ' +
      percentText(recipe.mastery.yieldOrRetentionChance);
    updateProgress(ref.progress, recipe);
    updateActionControl(ref.holder, recipe, !recipe.unlocked);
  }

  function buildProduction(navName, c) {
    const info = api().queries.skillPage(navName);
    const refs = contentState.refs;
    buildSkillHead(c, info, 'production-page');
    if (!Array.isArray(info.recipes)) {
      const legacyGrid = el('div', 'action-grid', c);
      (info.actions || []).forEach(function (action) {
        const card = el(
          'div',
          'action-card' + (action.locked ? ' locked' : ''),
          legacyGrid
        );
        el('div', 'card-title', card, action.name);
        el(
          'div',
          'action-meta',
          card,
          action.locked ? '尚未解锁' : action.time + ' 秒'
        );
      });
      refs.legacyProduction = true;
      return;
    }
    refs.pageStructure = productionTopology(info);
    refs.skillBonus.textContent = productionBonusText(info);
    const grid = el('div', 'action-grid', c);
    refs.recipeCards = {};
    info.recipes.forEach(function (recipe) {
      const card = el(
        'div',
        'action-card recipe-card' + (recipe.unlocked ? '' : ' locked'),
        grid
      );
      const titleEl = el('div', 'card-title', card);
      const metaEl = el('div', 'action-meta', card);
      const costRows = [];
      const choiceRows = [];
      if (recipe.costs.length) {
        el('div', 'cost-title', card, '固定材料');
        recipe.costs.forEach(function (cost) {
          costRows.push(el('div', 'cost-row', card));
        });
      }
      recipe.choiceCosts.forEach(function (choice) {
        el('div', 'cost-title', card, '任选其一');
        const rows = [];
        choice.options.forEach(function (cost) {
          rows.push(el('div', 'cost-row', card));
        });
        choiceRows.push(rows);
      });
      const outputEl = el('div', 'action-out', card);
      const masteryEl = el('div', 'mastery-line', card);
      const progress = addProgress(card, recipe);
      const holder = el('div', 'action-control', card);
      const ref = {
        cardEl: card,
        titleEl,
        metaEl,
        costRows,
        choiceRows,
        outputEl,
        masteryEl,
        progress,
        holder
      };
      refs.recipeCards[recipe.recipeId] = ref;
      updateProductionCard(ref, recipe);
    });
  }

  function liveProduction(navName) {
    const info = api().queries.skillPage(navName);
    const refs = contentState.refs;
    updateSkillHead(info);
    if (refs.legacyProduction || !Array.isArray(info.recipes)) return;
    if (refs.pageStructure !== productionTopology(info)) {
      rebuildContent(navName);
      return;
    }
    refs.skillBonus.textContent = productionBonusText(info);
    info.recipes.forEach(function (recipe) {
      const ref = refs.recipeCards[recipe.recipeId];
      if (!ref) return;
      updateProductionCard(ref, recipe);
    });
  }

  function buildGatherAction(card, action, disabled) {
    const progress = addProgress(card, action);
    const holder = el('div', 'action-control', card);
    updateActionControl(holder, action, disabled);
    return { progress, holder };
  }

  function gatherTopology(info) {
    return JSON.stringify({
      skillId: info.skillId,
      explore: info.explore ? info.explore.actionKey : null,
      resource: info.resource
        ? {
            instanceId: info.resource.instanceId,
            entryId: info.resource.entryId,
            actionKey: info.resource.actionKey,
            drops: info.resource.drops.map(function (drop) {
              return drop.itemId;
            })
          }
        : null,
      spots: info.spots.map(function (spot) {
        return {
          spotId: spot.spotId,
          actionKey: spot.actionKey,
          species: spot.species.map(function (species) {
            return species.speciesId;
          })
        };
      })
    });
  }

  function gatherBonusText(info) {
    return '技艺加速 ' + percentText(info.bonuses.skillSpeedBonus) +
      ' · 额外产出 ' +
      percentText(info.bonuses.gatheringExtraYieldChance) +
      ' · 行动减时 ' +
      percentText(info.bonuses.gatheringDurationReduction) +
      (info.skillId === 'fishing'
        ? ' · 鱼群恢复减时 ' +
          percentText(info.bonuses.fishRecoveryReduction)
        : '');
  }

  function updateExploreCard(ref, explore) {
    ref.titleEl.textContent = explore.name;
    ref.metaEl.textContent =
      '有效耗时 ' + explore.durationSeconds + ' 秒 · +' +
      explore.skillXp + ' XP';
    updateProgress(ref.progress, explore);
    updateActionControl(ref.holder, explore, false);
  }

  function updateResourceCard(ref, resource) {
    ref.titleEl.textContent = resource.name;
    ['common', 'fine', 'rare'].forEach(function (quality) {
      ref.qualityEl.classList.remove('quality-' + quality);
    });
    ref.qualityEl.classList.add('quality-' + resource.quality);
    ref.qualityEl.textContent =
      '品质 ' + (RESOURCE_QUALITY_LABELS[resource.quality] || resource.quality);
    ref.metaEl.textContent =
      '剩余 ' + resource.remaining + ' / ' + resource.capacity +
      ' · 有效耗时 ' + resource.durationSeconds + ' 秒';
    ref.masteryEl.textContent =
      '熟练 Lv.' + resource.mastery.level + ' · 加速 ' +
      percentText(resource.mastery.speedBonus) +
      ' · 额外产出 ' +
      percentText(resource.mastery.extraYieldChance);
    resource.drops.forEach(function (drop, index) {
      renderItemLine(
        ref.dropRows[index],
        drop,
        drop.name + ' ×' + drop.quantity
      );
    });
    updateProgress(ref.progress, resource);
    updateActionControl(ref.holder, resource, false);
  }

  function updateFishingCard(ref, spot) {
    ref.cardEl.classList.toggle('locked', !spot.unlocked);
    ref.titleEl.textContent = spot.name;
    ref.metaEl.textContent = spot.unlocked
      ? '有效耗时 ' + spot.durationSeconds + ' 秒 · +' +
        spot.skillXp + ' XP'
      : '需 Lv.' + spot.unlockLevel + ' 解锁';
    spot.species.forEach(function (species, index) {
      renderItemLine(
        ref.stockRows[index],
        Object.assign({ itemId: species.speciesId }, species),
        species.name + ' ' + species.stock + '/' + species.maxStock
      );
    });
    updateProgress(ref.progress, spot);
    updateActionControl(ref.holder, spot, !spot.unlocked);
  }

  function buildGather(navName, c) {
    const info = api().queries.gatherPage(navName);
    const refs = contentState.refs;
    buildSkillHead(c, info, 'gather-page');
    if (!Array.isArray(info.spots)) {
      const legacyGrid = el('div', 'action-grid', c);
      (info.cards || []).forEach(function (entry) {
        const card = el(
          'div',
          'action-card' + (entry.locked ? ' locked' : ''),
          legacyGrid
        );
        el('div', 'card-title', card, entry.name);
        el(
          'div',
          'action-meta',
          card,
          entry.time ? entry.time + ' 秒' : '探索'
        );
      });
      refs.legacyGather = true;
      return;
    }
    refs.pageStructure = gatherTopology(info);
    refs.skillBonus.textContent = gatherBonusText(info);
    const grid = el('div', 'action-grid', c);
    refs.gatherSpots = {};
    if (info.explore) {
      const card = el('div', 'action-card explore-card', grid);
      const titleEl = el('div', 'card-title', card);
      const metaEl = el('div', 'action-meta', card);
      const action = buildGatherAction(card, info.explore, false);
      refs.gatherExplore = Object.assign({ titleEl, metaEl }, action);
      updateExploreCard(refs.gatherExplore, info.explore);
    }
    if (info.resource) {
      const resource = info.resource;
      const card = el('div', 'action-card resource-card', grid);
      const titleEl = el('div', 'card-title', card);
      const qualityEl = el('div', 'quality', card);
      const metaEl = el('div', 'action-meta', card);
      const masteryEl = el('div', 'mastery-line', card);
      const drops = el('div', 'drop-list', card);
      const dropRows = [];
      resource.drops.forEach(function (drop) {
        dropRows.push(el('div', 'drop-row', drops));
      });
      const action = buildGatherAction(card, resource, false);
      refs.gatherResource = Object.assign({
        titleEl,
        qualityEl,
        metaEl,
        masteryEl,
        dropRows
      }, action);
      updateResourceCard(refs.gatherResource, resource);
    }
    info.spots.forEach(function (spot) {
      const card = el(
        'div',
        'action-card fishing-card' + (spot.unlocked ? '' : ' locked'),
        grid
      );
      const titleEl = el('div', 'card-title', card);
      const metaEl = el('div', 'action-meta', card);
      const stock = el('div', 'fish-stocks', card);
      const stockRows = [];
      spot.species.forEach(function (species) {
        stockRows.push(el('div', 'fish-stock', stock));
      });
      const action = buildGatherAction(card, spot, !spot.unlocked);
      const ref = Object.assign({
        cardEl: card,
        titleEl,
        metaEl,
        stockRows
      }, action);
      refs.gatherSpots[spot.spotId] = ref;
      updateFishingCard(ref, spot);
    });
    if (!info.resource && info.skillId !== 'fishing') {
      el(
        'div',
        'gather-hint',
        c,
        '尚未探索，先进行探索以发现资源点'
      );
    }
  }

  function liveGather(navName) {
    const info = api().queries.gatherPage(navName);
    const refs = contentState.refs;
    updateSkillHead(info);
    if (refs.legacyGather || !Array.isArray(info.spots)) return;
    if (refs.pageStructure !== gatherTopology(info)) {
      rebuildContent(navName);
      return;
    }
    refs.skillBonus.textContent = gatherBonusText(info);
    if (info.explore) updateExploreCard(refs.gatherExplore, info.explore);
    if (info.resource) {
      updateResourceCard(refs.gatherResource, info.resource);
    }
    info.spots.forEach(function (spot) {
      const ref = refs.gatherSpots[spot.spotId];
      if (ref) updateFishingCard(ref, spot);
    });
  }

  function buildReserve(c, className, title, text) {
    const card = el('div', 'card reserve-card ' + className, c);
    el('div', 'card-title', card, title);
    el('div', 'muted', card, text);
  }

  const INHERITANCE_SECTIONS = [
    ['overview', '概览'],
    ['plan', '传承方案'],
    ['descendants', '后代'],
    ['lives', '历代']
  ];
  const LIFE_STAGE_LABELS = {
    child: '幼年',
    adult: '成年',
    elder: '晚年'
  };

  function buildInheritanceHall(c) {
    if (!api().queries.inheritanceHall) {
      buildReserve(
        c,
        'reserve-inheritance',
        '传承殿',
        '将在传承阶段开放'
      );
      return;
    }
    const refs = contentState.refs;
    refs.inheritanceTabs = el('div', 'inheritance-tabs', c);
    refs.inheritanceHost = el('div', 'inheritance-host', c);
    refs.inheritanceSignature = null;
    INHERITANCE_SECTIONS.forEach(function (entry) {
      const button = el(
        'button',
        'inheritance-tab',
        refs.inheritanceTabs,
        entry[1]
      );
      button.addEventListener('click', function () {
        inheritanceUiState.section = entry[0];
        refs.inheritanceSignature = null;
        renderInheritanceHall();
      });
    });
    renderInheritanceHall();
  }

  function liveInheritanceHall() {
    renderInheritanceHall();
  }

  function renderLifespanCard(parent, lifespan) {
    const card = el('div', 'card lifespan-card', parent);
    el('div', 'card-title', card, '本世寿元');
    el(
      'div',
      'lifespan-value',
      card,
      '年龄 ' + (lifespan.ageYears || 0) + ' 岁 · 剩余 ' +
        (lifespan.remainingYears || 0) + '/' +
        (lifespan.maximumYears || 0) + ' 年寿元'
    );
    if (lifespan.status === 'safety_buffer') {
      el(
        'div',
        'buffer-warning',
        card,
        '已进入寿元安全缓冲，请完成传承或创建新身份。'
      );
    } else if (lifespan.status === 'transition_pending') {
      el('div', 'buffer-warning', card, '人生转换正在等待你的选择。');
    } else {
      el(
        'div',
        'muted',
        card,
        '寿元将尽前会进入安全缓冲，期间不会丢失本世记录。'
      );
    }
  }

  function parseInheritanceIds(value) {
    const seen = {};
    return String(value || '').split(/[,，\s]+/).map(function (id) {
      return id.trim();
    }).filter(function (id) {
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function renderInheritancePlan(parent, view) {
    const card = el('div', 'card inheritance-plan', parent);
    el('div', 'card-title', card, '传承方案');
    el(
      'div',
      'muted',
      card,
      '填写条目 ID，以逗号分隔；一级传承殿只保存当前基础名额。'
    );
    const fields = {};
    [
      ['fullMasteryIds', '完整精通', '项'],
      ['techniqueIds', '功法', '部'],
      ['equipmentItemIds', '装备', '件'],
      ['resourceItemIds', '资源种类', '类']
    ].forEach(function (definition) {
      const row = el('label', 'inheritance-plan-row', card);
      el(
        'span',
        'inheritance-plan-label',
        row,
        definition[1] + '（最多 ' +
          (view.overview.limits[definition[0]] || 0) +
          definition[2] + '）'
      );
      const input = el('input', 'inheritance-plan-input', row);
      input.type = 'text';
      input.placeholder = '以逗号分隔';
      input.value = (view.plan[definition[0]] || []).join(', ');
      fields[definition[0]] = input;
    });
    const save = el(
      'button',
      'big-btn inheritance-plan-save',
      card,
      '保存方案'
    );
    save.addEventListener('click', function () {
      invokeCommand('setInheritancePlan', {
        fullMasteryIds: parseInheritanceIds(fields.fullMasteryIds.value),
        techniqueIds: parseInheritanceIds(fields.techniqueIds.value),
        equipmentItemIds: parseInheritanceIds(
          fields.equipmentItemIds.value
        ),
        resourceItemIds: parseInheritanceIds(fields.resourceItemIds.value)
      });
    });
  }

  function renderDescendants(parent, descendants) {
    if (!descendants.length) {
      el('div', 'placeholder', parent, '尚无后代记录');
      return;
    }
    const grid = el('div', 'descendant-list', parent);
    descendants.forEach(function (person) {
      const card = el('div', 'card descendant-card', grid);
      el('div', 'card-title', card, person.name);
      el(
        'div',
        'descendant-meta',
        card,
        (person.ageYears || 0) + ' 岁 · ' +
          (LIFE_STAGE_LABELS[person.lifeStage] || person.lifeStage)
      );
      el(
        'div',
        person.heirEligible ? 'heir-eligible' : 'muted',
        card,
        person.heirEligible ? '可继承本世传承' : '目前不可继承'
      );
    });
  }

  function renderCompletedLives(parent, lives) {
    if (!lives.length) {
      el('div', 'placeholder', parent, '本世尚未结束，暂无历代记录');
      return;
    }
    lives.slice().reverse().forEach(function (life) {
      const card = el('div', 'card legacy-preview', parent);
      const name = life.identity && life.identity.name
        ? life.identity.name
        : '未名旧世';
      el(
        'div',
        'card-title',
        card,
        '第 ' + (life.generation || 1) + ' 世 · ' + name
      );
      el(
        'div',
        'muted',
        card,
        '结局：' +
          (life.outcome === 'handover' ? '后代接续' : '进入轮回') +
          ' · 结束时境界阶段 ' + (life.realmStage || 0)
      );
    });
  }

  function renderInheritanceHall() {
    const refs = contentState.refs;
    if (!refs.inheritanceHost || !api().queries.inheritanceHall) return;
    const view = api().queries.inheritanceHall({
      section: inheritanceUiState.section
    });
    const signature = JSON.stringify(view);
    if (signature === refs.inheritanceSignature) return;
    refs.inheritanceSignature = signature;
    Array.prototype.forEach.call(
      refs.inheritanceTabs.children,
      function (button, index) {
        button.classList.toggle(
          'active',
          INHERITANCE_SECTIONS[index][0] === inheritanceUiState.section
        );
      }
    );
    refs.inheritanceHost.innerHTML = '';
    if (!view || !view.implemented) {
      buildReserve(
        refs.inheritanceHost,
        'reserve-inheritance',
        '传承殿',
        '当前存档尚未启用传承殿'
      );
      return;
    }
    renderLifespanCard(refs.inheritanceHost, view.lifespan);
    if (inheritanceUiState.section === 'plan') {
      renderInheritancePlan(refs.inheritanceHost, view);
    } else if (inheritanceUiState.section === 'descendants') {
      renderDescendants(refs.inheritanceHost, view.descendants || []);
    } else if (inheritanceUiState.section === 'lives') {
      renderCompletedLives(refs.inheritanceHost, view.lives || []);
    } else {
      const summary = el('div', 'card legacy-preview', refs.inheritanceHost);
      el('div', 'card-title', summary, '一级传承殿');
      el(
        'div',
        'muted',
        summary,
        '后代 ' + (view.overview.descendantCount || 0) +
          ' 人 · 已完成 ' + (view.overview.completedLifeCount || 0) +
          ' 段人生'
      );
      const start = el(
        'button',
        'big-btn legacy-start',
        summary,
        '主动开始人生转换'
      );
      start.addEventListener('click', function () {
        invokeCommand('beginLegacyTransition', { cause: 'voluntary' });
      });
    }
  }

  function buildRelationship(c) {
    const refs = contentState.refs;
    const card = el('div', 'card charm-card', c);
    refs.charmTitle = el('div', 'card-title', card);
    refs.charmXp = el('div', 'charm-xp', card);
    refs.charmBenefits = el('div', 'charm-benefits', card);
    refs.charmText = el('div', 'muted', card);
    if (!api().queries.relationships) {
      buildReserve(
        c,
        'reserve-stage4',
        '关系',
        '完整关系系统将在人物与事件阶段开放'
      );
      return;
    }
    const tools = el('div', 'relationship-tools', c);
    refs.relationshipSearch = el('input', 'relationship-search', tools);
    refs.relationshipSearch.type = 'search';
    refs.relationshipSearch.placeholder = '搜索姓名、地区或宗门';
    refs.relationshipSearch.value = relationshipUiState.search;
    refs.relationshipSearch.addEventListener('input', function (event) {
      relationshipUiState.search = event.target.value;
      refs.relationshipSignature = null;
      renderRelationshipWorld();
    });
    refs.relationshipSort = el('select', 'relationship-sort', tools);
    [
      ['recent', '最近来往'],
      ['affection', '好感'],
      ['trust', '信任'],
      ['name', '姓名']
    ].forEach(function (entry) {
      addOption(refs.relationshipSort, entry[0], entry[1]);
    });
    refs.relationshipSort.value = relationshipUiState.sort;
    refs.relationshipSort.addEventListener('change', function (event) {
      relationshipUiState.sort = event.target.value;
      refs.relationshipSignature = null;
      renderRelationshipWorld();
    });
    refs.relationshipHost = el('div', 'relationship-layout', c);
  }

  function liveRelationship() {
    const view = api().queries.charm();
    const refs = contentState.refs;
    if (!refs.charmTitle) return;
    refs.charmTitle.textContent = '魅力 Lv.' + view.level;
    refs.charmXp.textContent = view.xp + '/' + view.nextXp;
    refs.charmBenefits.textContent =
      '正向关系 ×' +
      view.benefits.positiveRelationMultiplier.toFixed(2) +
      ' · 误会降低 ' +
      percentText(view.benefits.misunderstandingReduction);
    refs.charmText.textContent = '魅力' + view.text;
    renderRelationshipWorld();
  }

  const RELATION_LABELS = {
    affection: '好感',
    trust: '信任',
    romanticAttachment: '心动',
    desire: '亲近',
    dependence: '依赖',
    loyalty: '忠诚',
    jealousy: '吃醋',
    resentment: '芥蒂'
  };

  const BOND_LABELS = {
    stranger: '陌生',
    acquaintance: '相识',
    friend: '好友',
    lover: '恋人',
    partner: '正式伴侣',
    separated: '已分开'
  };

  function renderSocialPanel(parent, detail) {
    const social = api().queries.social({ npcId: detail.npcId });
    if (!social) return;
    const card = el('div', 'card social-panel', parent);
    el('div', 'card-title', card, '可进行的互动');
    if (social.mainSlotBusy) {
      el(
        'div',
        'social-warning',
        card,
        '开始互动会切换当前主行动'
      );
    }
    if (social.current) {
      const current = el('div', 'social-progress', card);
      el('div', 'social-progress-name', current, social.current.label);
      ratioBar(
        current,
        'action-progress',
        Math.round(social.current.progress * 100) + '%',
        social.current.progress,
        1
      );
    }
    social.parallel.forEach(function (progress) {
      const row = el('div', 'social-progress named-progress', card);
      el('div', 'social-progress-name', row, progress.label);
      ratioBar(
        row,
        'action-progress',
        progress.ready ? '准备完成' :
          '还需 ' + fmtDur(progress.remainingSeconds),
        progress.progress,
        1
      );
    });
    if (!social.interactions.length) {
      el('div', 'muted', card, '与对方的事情尚未结束');
      return;
    }
    social.interactions.forEach(function (action) {
      const row = el('div', 'social-action', card);
      const text = el('div', 'social-action-copy', row);
      el('div', 'social-action-name', text, action.label);
      el(
        'div',
        'muted',
        text,
        fmtDur(action.durationSeconds) +
          ' · 魅力经验 +' + action.rewards.charmXp +
          ' · 修为 +' + action.rewards.cultivation
      );
      if (action.requiresGift) {
        const select = el('select', 'gift-select', row);
        social.gifts.forEach(function (gift) {
          addOption(
            select,
            gift.itemId,
            gift.name + ' ×' + gift.quantity
          );
        });
        const button = el('button', 'small-btn social-start', row, '赠送');
        button.disabled = social.gifts.length === 0;
        button.addEventListener('click', function () {
          invokeCommand('startSocial', {
            npcId: detail.npcId,
            interactionId: action.id,
            itemId: select.value
          });
        });
      } else {
        const button = el('button', 'small-btn social-start', row, '开始');
        button.addEventListener('click', function () {
          invokeCommand('startSocial', {
            npcId: detail.npcId,
            interactionId: action.id
          });
        });
      }
    });
  }

  function renderPersonDetail(parent, detail) {
    if (!detail) {
      el('div', 'placeholder', parent, '选择一位人物查看详情');
      return;
    }
    const card = el('div', 'card person-detail', parent);
    el('div', 'card-title', card, detail.name);
    el(
      'div',
      'person-meta',
      card,
      detail.realm + ' · ' +
        (detail.sect ? detail.sect.name : '散修') + ' · ' +
        (detail.region ? detail.region.name : '行踪不明')
    );
    el(
      'div',
      'bond-stage',
      card,
      '关系：' + (BOND_LABELS[detail.bond.stage] || detail.bond.stage)
    );
    if (detail.romancePrinciple) {
      el(
        'div',
        'romance-principle',
        card,
        detail.romancePrinciple.name + '：' +
          detail.romancePrinciple.summary
      );
    }
    if (detail.biography.length) {
      el(
        'div',
        'biography-highlights',
        card,
        detail.biography.join(' · ')
      );
    }
    const grid = el('div', 'relation-grid', card);
    const head = el('div', 'relation-direction relation-head', grid);
    el('span', '', head, '关系维度');
    el('span', '', head, '你对' + detail.pronoun);
    el('span', '', head, detail.name + '对你');
    detail.metrics.forEach(function (metric) {
      const row = el('div', 'relation-direction', grid);
      el('span', '', row, RELATION_LABELS[metric.id] || metric.id);
      el('span', '', row, String(metric.playerToPerson));
      el('span', '', row, String(metric.personToPlayer));
    });
    if (detail.bond.stage === 'partner') {
      const ritualButton = el(
        'button',
        'big-btn lineage-ritual-button',
        card,
        '共议传承仪式'
      );
      ritualButton.addEventListener('click', function () {
        invokeCommand('proposeLineageRitual', {
          partnerNpcId: detail.npcId
        });
      });
    }
    renderSocialPanel(parent, detail);
  }

  function renderRelationshipWorld() {
    const refs = contentState.refs;
    if (!refs.relationshipHost || !api().queries.relationships) return;
    const list = api().queries.relationships({
      search: relationshipUiState.search,
      sort: relationshipUiState.sort
    });
    if (!relationshipUiState.selectedId && list.people.length) {
      relationshipUiState.selectedId = list.people[0].npcId;
    }
    if (relationshipUiState.selectedId &&
        !list.people.some(function (person) {
          return person.npcId === relationshipUiState.selectedId;
        }) && list.people.length) {
      relationshipUiState.selectedId = list.people[0].npcId;
    }
    const detail = relationshipUiState.selectedId
      ? api().queries.relationship({
        npcId: relationshipUiState.selectedId
      })
      : null;
    const social = detail
      ? api().queries.social({ npcId: detail.npcId })
      : null;
    const signature = JSON.stringify([list, detail, social]);
    if (refs.relationshipSignature === signature) return;
    refs.relationshipSignature = signature;
    refs.relationshipHost.innerHTML = '';
    const listHost = el('div', 'person-list', refs.relationshipHost);
    if (!list.people.length) {
      el('div', 'placeholder', listHost, '没有找到人物');
    }
    list.people.forEach(function (person) {
      const button = el(
        'button',
        'person-list-item' +
          (person.npcId === relationshipUiState.selectedId
            ? ' active'
            : ''),
        listHost
      );
      el('span', 'person-list-name', button, person.name);
      el(
        'span',
        'person-list-meta',
        button,
        person.realm + ' · ' + person.sectName +
          ' · 好感 ' + person.affection
      );
      button.addEventListener('click', function () {
        relationshipUiState.selectedId = person.npcId;
        refs.relationshipSignature = null;
        renderRelationshipWorld();
      });
    });
    const detailHost = el('div', 'person-detail-host', refs.relationshipHost);
    renderPersonDetail(detailHost, detail);
  }

  function addOption(select, value, label, className) {
    const option = el('option', className || '', select, label);
    option.value = value == null ? '' : String(value);
    return option;
  }

  function ratioBar(parent, className, label, current, maximum) {
    const max = Math.max(1, Number(maximum) || 1);
    const value = Math.max(0, Number(current) || 0);
    const bar = el('div', className, parent);
    const fill = el('div', 'meter-fill', bar);
    fill.style.width = percent(value / max) + '%';
    el('div', 'meter-text', bar, label + ' ' + value + '/' + max);
    return bar;
  }

  function buildCombat(c) {
    c.classList.add('combat-page');
    const refs = contentState.refs;
    refs.combatTabs = el('div', 'combat-tabs', c);
    refs.combatHost = el('div', 'combat-host', c);
    refs.combatSignature = null;
    COMBAT_TABS.forEach(function (entry) {
      const button = el('button', 'combat-tab', refs.combatTabs, entry[1]);
      button.addEventListener('click', function () {
        combatUiState.tab = entry[0];
        renderCombatView();
      });
    });
    renderCombatView();
  }

  function liveCombat() {
    renderCombatView();
  }

  function activeLoadoutForBattle(view) {
    if (!view || !Array.isArray(view.plans)) return null;
    const id = view.activeSessionLoadoutId || view.activeLoadoutId;
    return view.plans.find(function (plan) { return plan.id === id; }) ||
      null;
  }

  // ============================================================
  // 独立战斗界面（银河奶牛放置式：左右对阵 + 行动条 + 技能栏 + 战斗日志）
  // 建一次、逐帧增量更新；数据全部来自 combat 查询的 active 视图。
  // ============================================================
  const BATTLE_STATUS_LABELS = { shock: '震慑', slow: '迟缓', haste: '疾速' };
  const BATTLE_TICK_SECONDS = 0.25;
  const BATTLE_LOG_LIMIT = 40;

  function battleMeter(parent, cls, label) {
    const bar = el('div', 'battle-meter ' + cls, parent);
    const fill = el('div', 'battle-meter-fill', bar);
    const text = el('div', 'battle-meter-text', bar, label || '');
    return { root: bar, fill: fill, text: text };
  }

  function battleActionRow(parent) {
    const row = el('div', 'battle-action', parent);
    el('div', 'battle-action-label', row, '出手');
    const track = el('div', 'battle-action-track', row);
    const fill = el('div', 'battle-action-fill', track);
    return { root: row, fill: fill };
  }

  // 阵营容器：我方阵营 / 敌方阵营。内部 .battle-units 可容纳多个单位，
  // 为多对多战斗预留接口（当前每方固定 1 个）。
  function buildBattleFaction(parent, side) {
    const root = el('div', 'battle-faction battle-faction-' + side, parent);
    const unitsHost = el('div', 'battle-units', root);
    return { root: root, unitsHost: unitsHost, units: [] };
  }

  // 单个战斗单位卡片（技能槽在卡片内、信息下方）
  function buildBattleUnit(unitsHost, side, hasTechniques) {
    const card = el('div', 'battle-unit battle-unit-' + side, unitsHost);
    const head = el('div', 'battle-side-head', card);
    const name = el('div', 'battle-side-name', head, '');
    const rank = el('span', 'battle-side-rank', head, '');
    rank.style.display = 'none';
    const wrap = el('div', 'battle-portrait-wrap', card);
    let portrait;
    if (side === 'player') {
      portrait = el('canvas', 'battle-portrait', wrap);
    } else {
      portrait = el('div', 'battle-portrait battle-enemy-visual', wrap);
    }
    const respawn = el('div', 'battle-respawn', wrap, '');
    respawn.style.display = 'none';
    const floats = el('div', 'battle-floats', wrap);
    const hp = battleMeter(card, 'hp', '');
    const qi = side === 'player' ? battleMeter(card, 'qi', '') : null;
    const action = battleActionRow(card);
    const chips = el('div', 'battle-status-chips', card);
    let skills = null;
    if (hasTechniques) skills = buildBattleUnitSkills(card);
    return {
      card: card, name: name, rank: rank, wrap: wrap,
      portrait: portrait, respawn: respawn, floats: floats,
      hp: hp, qi: qi, action: action, chips: chips, skills: skills
    };
  }

  function buildBattleUnitSkills(parent) {
    const host = el('div', 'battle-unit-skills', parent);
    const slots = [];
    for (let index = 0; index < 3; index++) {
      const slot = el('div', 'skill-slot empty', host);
      const cd = el('div', 'skill-cd', slot);
      const nameEl = el('div', 'skill-name', slot, '');
      const costEl = el('div', 'skill-cost', slot, '');
      slots.push({ root: slot, cd: cd, name: nameEl, cost: costEl });
    }
    return slots;
  }

  function pushBattleLog(battle, kind, text) {
    if (!battle || !battle.logHost) return;
    const host = battle.logHost;
    const row = document.createElement('div');
    row.className = 'log-row log-' + kind;
    row.textContent = text;
    if (typeof host.insertBefore === 'function') {
      const ref = typeof host.firstChild === 'undefined' ? null : host.firstChild;
      host.insertBefore(row, ref);
    }
    if (host.childNodes && typeof host.removeChild === 'function') {
      while (host.childNodes.length > BATTLE_LOG_LIMIT) {
        host.removeChild(host.lastChild);
      }
    }
  }

  function buildBattleScreen(host, active) {
    host.innerHTML = '';
    const screen = el('div', 'battle-screen', host);

    const head = el('div', 'battle-head', screen);
    const headMain = el('div', 'battle-head-main', head);
    const title = el('div', 'battle-title', headMain, '');
    const waveText = el('div', 'battle-wave-text', headMain, '');
    // 食物配置：图标卡片格位，与副本名字、撤退按钮处于同一排
    const suppliesHost = el('div', 'battle-supplies', head);
    const retreat = el('button', 'battle-retreat', head, '撤退');
    retreat.addEventListener('click', function () {
      invokeCommand('stopAction');
    });

    const arena = el('div', 'battle-arena', screen);
    const playerFaction = buildBattleFaction(arena, 'player');
    el('div', 'battle-vs', arena, 'VS');
    const enemyFaction = buildBattleFaction(arena, 'enemy');

    const logHost = el('div', 'battle-log', screen);
    const lootPanel = el('div', 'battle-loot-panel', screen);
    const lootTitle = el('div', 'battle-loot-title', lootPanel, '战斗战利品');
    const lootList = el('div', 'battle-loot-list', lootPanel);

    const a = api();
    const top = safeQuery('top', undefined, null);
    const playerName = top && top.name ? top.name : '你';

    const battle = {
      built: true,
      layout: 'scalar',
      actionKey: active.actionKey,
      screen: screen,
      title: title,
      waveText: waveText,
      suppliesHost: suppliesHost,
      suppliesText: null,
      playerFaction: playerFaction,
      enemyFaction: enemyFaction,
      logHost: logHost,
      lootPanel: lootPanel,
      lootTitle: lootTitle,
      lootList: lootList,
      lootSignature: null,
      player: null,
      enemy: null,
      prev: null
    };
    contentState.refs.battle = battle;
    pushBattleLog(battle, 'system', '进入战斗：' + (active.title || '未知之地'));
    battle.player = syncBattleUnits(battle, playerFaction, active.player, 'player', active, null);
    battle.enemy = syncBattleUnits(battle, enemyFaction, active.enemy, 'enemy', active, null);
    if (battle.player && battle.player.portrait &&
        a && a.render && battle.player.portrait.getContext) {
      a.render.drawCharacter(battle.player.portrait);
    }
    battle.player.name.textContent = playerName;
    return battle;
  }

  function buildTeamBattleScreen(host, active) {
    host.innerHTML = '';
    const screen = el('div', 'battle-screen team-battle-screen', host);
    const head = el('div', 'battle-head', screen);
    const headMain = el('div', 'battle-head-main', head);
    const title = el('div', 'battle-title', headMain, '');
    const waveText = el('div', 'battle-wave-text', headMain, '');
    const retreat = el('button', 'battle-retreat', head, '撤退');
    retreat.addEventListener('click', function () {
      invokeCommand('stopAction');
    });

    const enemiesHost = el(
      'div',
      'team-battle-row team-battle-enemies',
      screen
    );
    const logHost = el('div', 'battle-log team-battle-log', screen);
    const alliesHost = el(
      'div',
      'team-battle-row team-battle-allies',
      screen
    );
    const lootPanel = el('div', 'battle-loot-panel', screen);
    const lootTitle = el('div', 'battle-loot-title', lootPanel, '战斗战利品');
    const lootList = el('div', 'battle-loot-list', lootPanel);
    const battle = {
      built: true,
      layout: 'vertical-team',
      actionKey: active.actionKey,
      screen: screen,
      title: title,
      waveText: waveText,
      enemies: { host: enemiesHost, units: [], signature: null },
      allies: { host: alliesHost, units: [], signature: null },
      logHost: logHost,
      lootPanel: lootPanel,
      lootTitle: lootTitle,
      lootList: lootList,
      lootSignature: null
    };
    contentState.refs.battle = battle;
    pushBattleLog(battle, 'system', '进入战斗：' + (active.title || '未知之地'));
    return battle;
  }

  function buildTeamBattleUnit(host) {
    const card = el('article', 'team-unit', host);
    const name = el('div', 'team-unit-name', card, '');
    const bars = el('div', 'team-unit-bars', card);
    const hp = el('div', 'team-unit-bar hp', bars);
    const hpFill = el('span', '', hp);
    const qi = el('div', 'team-unit-bar qi', bars);
    const qiFill = el('span', '', qi);
    const meta = el('div', 'team-unit-meta', card);
    const hpText = el('span', '', meta, '');
    const threat = el('span', '', meta, '');
    return {
      card: card,
      name: name,
      hpFill: hpFill,
      qiFill: qiFill,
      hpText: hpText,
      threat: threat
    };
  }

  function updateTeamBattleUnit(refs, unit) {
    const hpMax = Math.max(0, Number(unit.maxHp) || 0);
    const qiMax = Math.max(0, Number(unit.maxQi) || 0);
    const hp = Math.max(0, Number(unit.hp) || 0);
    const qi = Math.max(0, Number(unit.qi) || 0);
    refs.card.classList.toggle('fallen', unit.fallen === true);
    refs.name.textContent = unit.name || '未知单位';
    refs.hpFill.style.width = Math.round(
      hpMax > 0 ? Math.min(1, hp / hpMax) * 100 : 0
    ) + '%';
    refs.qiFill.style.width = Math.round(
      qiMax > 0 ? Math.min(1, qi / qiMax) * 100 : 0
    ) + '%';
    refs.hpText.textContent = Math.round(hp) + '/' + Math.round(hpMax);
    refs.threat.textContent = '威胁 ' + Math.round(Number(unit.threat) || 0);
  }

  function syncTeamBattleUnits(group, rows) {
    const units = Array.isArray(rows) ? rows : [];
    const signature = units.map(function (unit) { return unit.id; }).join('|');
    if (group.signature !== signature) {
      group.signature = signature;
      group.host.innerHTML = '';
      group.units = units.map(function () {
        return buildTeamBattleUnit(group.host);
      });
    }
    units.forEach(function (unit, index) {
      updateTeamBattleUnit(group.units[index], unit);
    });
  }

  function updateTeamBattleScreen(battle, active) {
    battle.title.textContent = active.title || '战斗';
    const wave = active.wave || {};
    const waveParts = [active.dangerLevel || 'safe'];
    if (Number.isFinite(wave.number)) {
      waveParts.push('第 ' + wave.number + ' 波');
    }
    if (Number.isFinite(wave.defeated) && wave.defeated > 0) {
      waveParts.push('已击败 ' + wave.defeated);
    }
    battle.waveText.textContent = waveParts.join(' · ');
    syncTeamBattleUnits(battle.enemies, active.enemies);
    syncTeamBattleUnits(battle.allies, active.allies);
    renderBattleLoot(battle, active.lootLog);
  }

  function spawnBattleFloat(side, text, cls) {
    if (!side || !side.floats) return;
    if (side.floats.childNodes.length > 6) {
      side.floats.removeChild(side.floats.firstChild);
    }
    const node = document.createElement('div');
    node.className = 'dmg-float' + (cls ? ' ' + cls : '');
    node.textContent = text;
    node.style.left = (35 + Math.round(Math.random() * 30)) + '%';
    side.floats.appendChild(node);
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 950);
  }

  function hitShake(side) {
    if (!side || !side.card) return;
    side.card.classList.remove('hit');
    void side.card.offsetWidth; // 重置动画
    side.card.classList.add('hit');
  }

  function updateBattleMeter(meter, label, current, maximum, extra) {
    const max = Math.max(1, Number(maximum) || 1);
    const value = Math.max(0, Number(current) || 0);
    meter.fill.style.width =
      Math.round(Math.max(0, Math.min(1, value / max)) * 100) + '%';
    meter.text.textContent = label + ' ' + Math.round(value) + '/' +
      Math.round(max) + (extra || '');
  }

  function battleAttackProgress(unit) {
    const interval = Math.max(1, Number(unit.attackIntervalTicks) || 1);
    const cooldown = Math.max(0, Number(unit.cooldownTicks) || 0);
    return Math.max(0, Math.min(1, 1 - cooldown / interval));
  }

  function updateBattleChips(host, statusEffects) {
    if (!host || !host.dataset) return;
    const rows = Array.isArray(statusEffects) ? statusEffects : [];
    const signature = rows.map(function (row) {
      return row.id + ':' + row.remainingTicks;
    }).join('|');
    if (host.dataset.signature === signature) return;
    host.dataset.signature = signature;
    host.innerHTML = '';
    rows.forEach(function (row) {
      const seconds = Math.ceil(row.remainingTicks * BATTLE_TICK_SECONDS);
      el(
        'span',
        'status-chip status-' + row.id,
        host,
        (BATTLE_STATUS_LABELS[row.id] || row.id) + ' ' + seconds + 's'
      );
    });
  }

  function battleEnemyGlyph(name) {
    return typeof name === 'string' && name.length > 0
      ? name.charAt(0)
      : '妖';
  }

  function diffBattleFrame(battle, active) {
    const prev = battle.prev;
    const player = active.player;
    const enemy = active.enemy;
    const enemyIdentity = [
      active.actionKey,
      active.wave.index,
      active.wave.defeated,
      enemy ? enemy.id : 'none',
      active.phase.index
    ].join('|');
    if (prev) {
      const sameEnemy = prev.enemyIdentity === enemyIdentity;
      if (sameEnemy && enemy && prev.enemyHp != null &&
          enemy.hp < prev.enemyHp) {
        const dealt = Math.round(prev.enemyHp - enemy.hp);
        spawnBattleFloat(battle.enemy, '-' + dealt, '');
        hitShake(battle.enemy);
        const action = active.currentAction;
        const viaTechnique = action && action.id !== 'normalAttack' &&
          action.tick !== (prev.actionTick == null ? -1 : prev.actionTick);
        pushBattleLog(
          battle,
          'player',
          viaTechnique
            ? '你施展「' + action.name + '」，对' + (enemy.name || '敌人') +
              '造成 ' + dealt + ' 点伤害'
            : '你攻击' + (enemy.name || '敌人') + '，造成 ' + dealt + ' 点伤害'
        );
      }
      if (player.hp < prev.playerHp) {
        const taken = Math.round(prev.playerHp - player.hp);
        spawnBattleFloat(battle.player, '-' + taken, '');
        hitShake(battle.player);
        pushBattleLog(
          battle,
          'enemy',
          (prev.enemyName || '敌人') + '对你造成 ' + taken + ' 点伤害'
        );
      } else if (player.hp > prev.playerHp) {
        const healed = Math.round(player.hp - prev.playerHp);
        spawnBattleFloat(battle.player, '+' + healed, 'heal');
        pushBattleLog(battle, 'heal', '补给生效，恢复 ' + healed + ' 点气血');
      }
      if (prev.enemyName && active.wave.defeated > prev.defeated) {
        pushBattleLog(battle, 'system', '击败了' + prev.enemyName + '！');
      }
      if (enemy && (!prev.enemyName || prev.enemyIdentity !== enemyIdentity)) {
        pushBattleLog(
          battle,
          'system',
          '遭遇' + (enemy.rankLabel && enemy.rankLabel !== '普通'
            ? '【' + enemy.rankLabel + '】'
            : '') + (enemy.name || '敌人')
        );
      }
    }
    const action = active.currentAction;
    battle.prev = {
      playerHp: player.hp,
      enemyHp: enemy ? enemy.hp : null,
      enemyName: enemy ? enemy.name : null,
      enemyIdentity: enemyIdentity,
      defeated: active.wave.defeated,
      actionTick: action ? action.tick : null
    };
  }

  // 同步阵营内的单位卡片（当前每方 1 个；units 数组为多对多战斗预留接口）
  function syncBattleUnits(battle, factionRefs, unitView, side, active, loadouts) {
    if (factionRefs.units.length === 0) {
      factionRefs.units.push(
        buildBattleUnit(factionRefs.unitsHost, side, side === 'player')
      );
    }
    const unit = factionRefs.units[0];
    updateBattleUnit(unit, unitView, side, active);
    return unit;
  }

  function updateBattleUnit(unit, unitView, side, active) {
    if (side === 'enemy') {
      if (unitView) {
        unit.card.classList.remove('waiting');
        unit.respawn.style.display = 'none';
        unit.portrait.style.display = '';
        unit.name.textContent = unitView.name || '敌人';
        const rankLabel = unitView.rankLabel || '';
        unit.rank.textContent = rankLabel;
        unit.rank.style.display =
          rankLabel && rankLabel !== '普通' ? '' : 'none';
        unit.rank.className = 'battle-side-rank rank-' +
          (unitView.rank || 'normal');
        unit.portrait.className =
          'battle-portrait battle-enemy-visual rank-' + (unitView.rank || 'normal');
        unit.portrait.textContent = battleEnemyGlyph(unitView.name);
        updateBattleMeter(unit.hp, '气血', unitView.hp, unitView.maxHp);
        unit.action.fill.style.width =
          Math.round(battleAttackProgress(unitView) * 100) + '%';
        updateBattleChips(unit.chips, unitView.statusEffects);
      } else {
        unit.card.classList.add('waiting');
        unit.portrait.style.display = 'none';
        unit.respawn.style.display = '';
        const waitSeconds = Math.max(
          0,
          active.wave.intermissionTicks * BATTLE_TICK_SECONDS
        );
        unit.respawn.textContent =
          '下一个对手即将现身…' +
          (waitSeconds > 0 ? waitSeconds.toFixed(1) + 's' : '');
        unit.name.textContent = '——';
        unit.rank.style.display = 'none';
        updateBattleMeter(unit.hp, '气血', 0, 1);
        unit.action.fill.style.width = '0%';
        updateBattleChips(unit.chips, []);
      }
      return;
    }
    // ── 我方 ──
    updateBattleMeter(
      unit.hp, '气血', unitView.hp, unitView.maxHp,
      unitView.shield > 0 ? '（盾 ' + Math.round(unitView.shield) + '）' : ''
    );
    updateBattleMeter(unit.qi, '真气', unitView.qi, unitView.maxQi);
    unit.action.fill.style.width =
      Math.round(battleAttackProgress(unitView) * 100) + '%';
    updateBattleChips(unit.chips, unitView.statusEffects);
    if (unit.skills) {
      const techniques = Array.isArray(active.techniques)
        ? active.techniques
        : [];
      const action = active.currentAction;
      const unlocked = Math.max(
        1,
        Math.min(
          unit.skills.length,
          Number(active.unlockedActiveSlots) || unit.skills.length
        )
      );
      for (let index = 0; index < unit.skills.length; index++) {
        const slot = unit.skills[index];
        if (index >= unlocked) {
          slot.root.className = 'skill-slot locked';
          slot.name.textContent = '';
          slot.cost.textContent = '';
          slot.cd.style.height = '0%';
          continue;
        }
        const row = techniques[index];
        if (!row || !row.techniqueId) {
          slot.root.className = 'skill-slot empty';
          slot.name.textContent = '';
          slot.cost.textContent = '';
          slot.cd.style.height = '0%';
          continue;
        }
        slot.name.textContent = row.name;
        slot.cost.textContent = '真气 ' + row.qiCost;
        const total = Math.max(1, row.cooldownTicks);
        const remaining = Math.max(0, row.remainingCooldownTicks);
        slot.cd.style.height =
          Math.round(Math.min(1, remaining / total) * 100) + '%';
        const casting = action && action.id === row.techniqueId &&
          remaining >= total - 2;
        slot.root.className = 'skill-slot' +
          (remaining > 0 ? ' cooling' : '') + (casting ? ' casting' : '');
      }
    }
  }

  // 食物配置：图标卡片格位（显示在副本名字下方）
  function renderBattleSupplies(battle, loadouts) {
    const loadout = activeLoadoutForBattle(loadouts);
    const supplies = loadout && Array.isArray(loadout.supplies)
      ? loadout.supplies.map(function (row) {
        return (SUPPLY_LABELS[row.slot] || row.slot) + '：' +
          (row.itemId ? (row.name || '未知物品') : '未配置') +
          (row.itemId ? ' ×' + (row.owned || 0) : '');
      }).join('　')
      : '未配置补给';
    if (battle.suppliesText === supplies) return;
    battle.suppliesText = supplies;
    battle.suppliesHost.innerHTML = '';
    if (!loadout || !Array.isArray(loadout.supplies) ||
        !loadout.supplies.length) {
      el('div', 'battle-supply empty', battle.suppliesHost, '未配置补给');
      return;
    }
    loadout.supplies.forEach(function (row) {
      const label = SUPPLY_LABELS[row.slot] || row.slot || '食';
      const name = row.itemId ? (row.name || label) : label;
      const tipData = row.itemId
        ? resolveItemTipData({
          itemId: row.itemId,
          name: row.name,
          owned: row.owned
        })
        : null;
      const cell = el(
        'div',
        'battle-supply' + (row.itemId ? '' : ' empty'),
        battle.suppliesHost
      );
      const icon = el('div', 'battle-supply-icon', cell);
      renderItemIcon(icon, tipData, { fallback: name.charAt(0) });
      el('div', 'battle-supply-name', cell, name);
      el('div', 'battle-supply-count', cell,
        row.itemId ? ('×' + (row.owned || 0)) : '空');
      if (tipData) attachItemTipTrigger(cell, tipData);
    });
  }

  function updateBattleScreen(battle, active, loadouts) {
    battle.title.textContent = active.title || '战斗';
    const wave = active.wave;
    const waveParts = [];
    if (active.mode === 'dungeon') {
      waveParts.push('第 ' + wave.number +
        (wave.waveCount ? '/' + wave.waveCount : '') + ' 波');
      if (wave.enemyTotal) {
        waveParts.push('本波 ' + Math.min(wave.defeated, wave.enemyTotal) +
          '/' + wave.enemyTotal);
      }
    } else {
      waveParts.push('已击败 ' + wave.defeated);
    }
    if (active.phase.number > 1) {
      waveParts.push('阶段 ' + active.phase.number);
    }
    battle.waveText.textContent = waveParts.join(' · ');

    battle.player = syncBattleUnits(
      battle, battle.playerFaction, active.player, 'player', active, loadouts
    );
    battle.enemy = syncBattleUnits(
      battle, battle.enemyFaction, active.enemy, 'enemy', active, loadouts
    );

    renderBattleSupplies(battle, loadouts);
    renderBattleLoot(battle, active.lootLog);

    diffBattleFrame(battle, active);
  }

  function renderBattleLoot(battle, lootLog) {
    if (!battle.lootList) return;
    const signature = JSON.stringify((lootLog || []).map(function (entry) {
      return entry.enemyId + ':' + entry.createdAtMs + ':' +
        JSON.stringify(entry.items) + ':' + (entry.currency || 0);
    }));
    if (battle.lootSignature === signature) return;
    battle.lootSignature = signature;
    battle.lootList.innerHTML = '';
    if (!lootLog || !lootLog.length) {
      el('div', 'battle-loot-empty', battle.lootList, '暂无战利品');
      return;
    }
    // 合并所有敌人的掉落到一个网格：相同物品（按 id+品质）累加数量
    const merged = {};
    lootLog.forEach(function (entry) {
      Object.keys(entry.items || {}).forEach(function (itemId) {
        const item = entry.items[itemId];
        if (!item) return;
        const key = itemId + '|' + (item.quality || 'white');
        if (!merged[key]) {
          merged[key] = {
            itemId: item.itemId || itemId,
            name: item.name,
            icon: item.icon || '📦',
            iconSrc: item.iconSrc || '',
            iconSrc50: item.iconSrc50 || '',
            iconSrc100: item.iconSrc100 || '',
            quality: item.quality || 'white',
            category: item.category || 'material',
            description: item.description || '',
            count: 0
          };
        }
        merged[key].count += Number(item.count) || 0;
      });
      if (Number(entry.currency) > 0) {
        if (!merged.__currency) {
          merged.__currency = {
            name: '灵石',
            icon: '💎',
            quality: 'orange',
            count: 0,
            currency: true
          };
        }
        merged.__currency.count += Number(entry.currency) || 0;
      }
    });
    const keys = Object.keys(merged);
    if (!keys.length) {
      el('div', 'battle-loot-empty', battle.lootList, '暂无战利品');
      return;
    }
    const grid = el('div', 'loot-grid', battle.lootList);
    keys.forEach(function (key) {
      buildLootCell(grid, merged[key]);
    });
    battle.lootList.scrollTop = battle.lootList.scrollHeight;
  }

  // 单个战利品方格（梅尔沃风格：图标 + 名称 + 数量角标 + 品质色）
  function buildLootCell(host, data) {
    const cell = el('div', 'loot-cell q-' + data.quality, host);
    if (data.currency) cell.classList.add('currency');
    renderItemIcon(el('div', 'loot-icon', cell), data);
    el('div', 'loot-name', cell, data.name);
    if (Number(data.count) > 1 || data.currency) {
      el('div', 'loot-qty', cell, '×' + data.count);
    }
    cell.title = data.name + (data.count > 1 ? ' ×' + data.count : '');
    if (!data.currency && data.itemId) {
      attachItemTipTrigger(cell, data);
    }
  }

  function renderBattleScreen(host, active, loadouts) {
    let battle = contentState.refs.battle;
    if (!battle || !battle.built || battle.actionKey !== active.actionKey ||
        battle.layout !== (active.layout || 'scalar')) {
      battle = active.layout === 'vertical-team'
        ? buildTeamBattleScreen(host, active)
        : buildBattleScreen(host, active);
    }
    if (active.layout === 'vertical-team') {
      updateTeamBattleScreen(battle, active);
      return;
    }
    updateBattleScreen(battle, active, loadouts);
  }

  function renderPendingLoot(host, pending) {
    if (!pending || typeof pending !== 'object') return;
    const card = el('div', 'card pending-loot', host);
    el('div', 'card-title', card, '待领取战利品');
    const list = el('div', 'pending-loot-list', card);
    if (Array.isArray(pending.itemRows) && pending.itemRows.length) {
      pending.itemRows.forEach(function (row) {
        const line = el('div', 'pending-loot-row', list);
        renderItemLine(
          line,
          Object.assign({ itemId: row.itemId || row.id }, row),
          row.name + ' ×' + row.count
        );
      });
    } else if (pending.items && typeof pending.items === 'object') {
      Object.keys(pending.items).forEach(function (itemId) {
        const line = el('div', 'pending-loot-row', list);
        renderItemLine(
          line,
          { itemId: itemId, count: pending.items[itemId] },
          itemId + ' ×' + pending.items[itemId]
        );
      });
    } else {
      el('div', 'pending-loot-row', list, '无物品');
    }
    el('div', 'pending-loot-currency', list, '灵石 ×' + (pending.currency || 0));
    const required = Math.max(0, Number(pending.requiredFreeSlots) || 0);
    el('div', 'pending-slots', card, '需要空位 ' + required);
    const claim = el(
      'button',
      'small-btn claim-combat-loot',
      card,
      pending.canClaim === false ? '整理背包后领取' : '领取战利品'
    );
    claim.disabled = pending.canClaim === false;
    if (!claim.disabled) {
      claim.addEventListener('click', function () {
        invokeCommand('claimCombatLoot');
      });
    }
  }

  function renderInjury(host, injury) {
    if (!injury || typeof injury !== 'object') return;
    const card = el('div', 'card injury-card', host);
    el('div', 'card-title', card, '重伤撤退');
    el(
      'div',
      'injury-time',
      card,
      '恢复剩余：' + fmtDur(injury.remainingSeconds)
    );
    el(
      'div',
      'injury-lock-message',
      card,
      '重伤期间无法开始战斗'
    );
    const treatment = injury.treatment;
    if (treatment && treatment.itemId) {
      const treat = el(
        'button',
        'small-btn treat-injury',
        card,
        '使用疗伤丹治疗（持有 ' + (treatment.owned || 0) + '）'
      );
      treat.disabled = treatment.available === false;
      treat.addEventListener('click', function () {
        invokeCommand('treatInjury');
      });
    }
  }

  function enemyStatText(enemy) {
    const stats = enemy && enemy.stats || {};
    return '修为奖励 +' + (enemy.cultivation || 0) +
      ' · 气血 ' + (stats.hp || 0) +
      ' · 攻击 ' + (stats.attack || 0) +
      ' · 击败 ' + (enemy.killCount || 0);
  }

  function dropPreviewText(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return '无';
    return rows.map(function (row) {
      const minimum = Number(row.min) || 0;
      const maximum = Number(row.max) || minimum;
      const quantity = minimum === maximum
        ? ' ×' + minimum
        : ' ×' + minimum + '–' + maximum;
      const chance = Number.isFinite(row.chance)
        ? '（' + Math.round(row.chance * 100) + '%）'
        : '';
      return (row.name || '未知战利品') + quantity + chance;
    }).join(' · ');
  }

  function rewardRowsText(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return '无';
    return rows.map(function (row) {
      return row.name + ' ×' + row.count;
    }).join(' · ');
  }

  function renderRegionCards(host, view) {
    const grid = el('div', 'combat-grid region-grid', host);
    const regions = view && Array.isArray(view.regions)
      ? view.regions
      : [];
    if (!regions.length) {
      el('div', 'placeholder', grid, '暂无可挑战区域');
      return;
    }
    regions.forEach(function (region) {
      const card = el('div', 'card region-card', grid);
      el(
        'div',
        'card-title',
        card,
        region.name + ' · ' + (region.unlocked ? '已开放' : '未开放')
      );
      const enemies = Array.isArray(region.enemies) ? region.enemies : [];
      enemies.forEach(function (enemy) {
        const row = el('div', 'enemy-card', card);
        el(
          'div',
          'enemy-name',
          row,
          enemy.name + ' · ' + (enemy.rankLabel || '未知')
        );
        el('div', 'enemy-stats', row, enemyStatText(enemy));
        el(
          'div',
          'enemy-drops',
          row,
          '掉落：' + dropPreviewText(enemy.drops)
        );
        const button = el(
          'button',
          'small-btn enemy-action',
          row,
          '开始挑战'
        );
        button.disabled = !region.unlocked || !!view.active ||
          !!view.injury || !!view.pendingLoot;
        button.addEventListener('click', function () {
          invokeCommand('startAction', {
            key: 'combat:region:' + region.id + ':' + enemy.id
          });
        });
      });
    });
  }

  function prerequisiteText(prerequisites) {
    if (!prerequisites) return '无';
    const rows = [
      '境界' + (prerequisites.realm && prerequisites.realm.met
        ? '已满足'
        : '未满足')
    ];
    if (prerequisites.priorDungeon) {
      rows.push(
        '前置副本' + (prerequisites.priorDungeon.met ? '已完成' : '未完成')
      );
    }
    (prerequisites.items || []).forEach(function (item) {
      rows.push(
        (item.name || '未知物品') + ' ' +
          item.owned + '/' + item.required +
          (item.met ? ' ✓' : '')
      );
    });
    return rows.join(' · ');
  }

  function renderDungeonCards(host, view) {
    const grid = el('div', 'combat-grid dungeon-grid', host);
    const dungeons = view && Array.isArray(view.dungeons)
      ? view.dungeons
      : [];
    if (!dungeons.length) {
      el('div', 'placeholder', grid, '暂无可挑战副本');
      return;
    }
    dungeons.forEach(function (dungeon) {
      const card = el('div', 'card dungeon-card', grid);
      el('div', 'card-title', card, dungeon.name);
      el(
        'div',
        'dungeon-waves',
        card,
        '波次：' + (dungeon.waves || []).map(function (wave) {
          return wave.enemyName + '（' + (wave.rankLabel || '未知') +
            '）×' + wave.count;
        }).join(' → ')
      );
      el(
        'div',
        'dungeon-prerequisites',
        card,
        '前置：' + prerequisiteText(dungeon.prerequisites)
      );
      el(
        'div',
        'first-clear',
        card,
        dungeon.firstClear && dungeon.firstClear.completed
          ? '首通：已完成'
          : '首通：未完成'
      );
      el(
        'div',
        'first-clear-rewards',
        card,
        '首通奖励：' + rewardRowsText(
          dungeon.firstClear && dungeon.firstClear.rewardRows
        )
      );
      el(
        'div',
        'repeat-rewards',
        card,
        '重复奖励：' + dropPreviewText(dungeon.repeatDrops)
      );
      const button = el(
        'button',
        'small-btn dungeon-action',
        card,
        '开始副本'
      );
      button.disabled = !dungeon.unlocked || !!view.active ||
        !!view.injury || !!view.pendingLoot;
      button.addEventListener('click', function () {
        invokeCommand('startAction', {
          key: 'combat:dungeon:' + dungeon.id
        });
      });
    });
  }

  // 重伤恢复倒计时是「每帧变化的浮点」，不能进结构签名；否则战斗区会每帧
  // innerHTML 重建，把疗伤丹按钮反复销毁，点击永远落不到稳定节点（= 点了没反应）。
  function stripInjuryCountdown(v) {
    if (!v || typeof v !== 'object' || !v.injury) return v;
    const copy = Object.assign({}, v);
    copy.injury = Object.assign({}, v.injury);
    delete copy.injury.remainingSeconds;
    return copy;
  }

  function refreshInjuryCountdown(host, view, canonical) {
    const injury = (view && view.injury) || (canonical && canonical.injury);
    if (!injury || !host || typeof host.querySelector !== 'function') return;
    const node = host.querySelector('.injury-card .injury-time');
    if (node) node.textContent = '恢复剩余：' + fmtDur(injury.remainingSeconds);
  }

  function renderCombatView() {
    const refs = contentState.refs;
    if (!refs.combatHost || !refs.combatTabs) return;
    Array.prototype.forEach.call(
      refs.combatTabs.children,
      function (button, index) {
        button.classList.toggle(
          'active',
          COMBAT_TABS[index][0] === combatUiState.tab
        );
      }
    );
    const host = refs.combatHost;
    const view = safeQuery(
      'combat',
      { tab: combatUiState.tab },
      null
    );
    const loadouts = safeQuery('combatLoadouts', undefined, null);
    const canonical = combatUiState.tab === 'regions'
      ? view
      : safeQuery('combat', { tab: 'regions' }, null);

    // ── 战斗进行中：切到独立战斗界面（隐藏页签，逐帧增量更新）──
    const activeBattle = (view && view.active) ||
      (canonical && canonical.active);
    if (activeBattle && (activeBattle.player ||
        activeBattle.layout === 'vertical-team')) {
      refs.combatTabs.style.display = 'none';
      refs.combatSignature = null; // 退出战斗后强制重建列表页
      renderBattleScreen(host, activeBattle, loadouts);
      return;
    }
    refs.combatTabs.style.display = '';
    if (contentState.refs.battle) contentState.refs.battle = null;

    // 结构签名：剔除「重伤恢复倒计时」这种每帧变化的浮点字段。
    // 否则每帧都会触发 host.innerHTML 重建，把疗伤丹按钮反复销毁，
    // 导致点击永远落不到稳定的按钮节点上（表现 = 点了没反应）。
    const signature = JSON.stringify([
      combatUiState.tab,
      stripInjuryCountdown(view),
      stripInjuryCountdown(canonical),
      loadouts
    ]);
    // 每帧就地刷新倒计时文字，避免重建 DOM。
    refreshInjuryCountdown(host, view, canonical);
    if (refs.combatSignature === signature) return;
    refs.combatSignature = signature;
    host.innerHTML = '';
    if (!view) {
      buildReserve(host, 'combat-unavailable', '战斗', '战斗数据暂不可用');
      return;
    }
    renderPendingLoot(
      host,
      view.pendingLoot || (canonical && canonical.pendingLoot)
    );
    renderInjury(host, view.injury || (canonical && canonical.injury));
    if (combatUiState.tab === 'regions') renderRegionCards(host, view);
    else if (combatUiState.tab === 'dungeons') {
      renderDungeonCards(host, view);
    } else {
      buildReserve(
        host,
        'combat-reserved',
        COMBAT_TABS.find(function (entry) {
          return entry[0] === combatUiState.tab;
        })[1],
        view.reason || '后续内容开放'
      );
    }
  }

  function conditionValue(condition) {
    if (!condition || condition.type === 'always') return '';
    if (condition.threshold != null) {
      return String(Math.round(condition.threshold * 100));
    }
    return condition.statusId || condition.buffId || '';
  }

  function conditionOptionRows(type, conditionOptions) {
    const rows = conditionOptions && conditionOptions[type];
    return Array.isArray(rows) ? rows : [];
  }

  function normalizedCondition(type, raw, conditionOptions) {
    if (type === 'always') return { type: 'always' };
    if (type === 'selfHpBelow' || type === 'enemyHpBelow' ||
        type === 'selfQiAbove') {
      const threshold = Math.max(
        1,
        Math.min(100, Math.round(Number(raw) || 1))
      );
      return { type: type, threshold: threshold / 100 };
    }
    const text = String(raw || '').trim();
    const valid = conditionOptionRows(type, conditionOptions).some(
      function (row) { return row && row.id === text; }
    );
    if (!valid) return null;
    return type === 'enemyHasStatus'
      ? { type: type, statusId: text }
      : { type: type, buffId: text };
  }

  function fillItemOptions(select, selectedId, rows) {
    addOption(select, '', '未配置');
    const seen = {};
    rows.forEach(function (row) {
      if (!row || !row.itemId || seen[row.itemId]) return;
      seen[row.itemId] = true;
      addOption(
        select,
        row.itemId,
        (row.name || '未知物品') +
          ' ×' + (row.available || row.quantity || 0)
      );
    });
    select.value = selectedId || '';
  }

  function renderEquipmentEditor(parent, plan, locked) {
    const section = el('div', 'loadout-section', parent);
    el('div', 'section-title', section, '装备');
    (plan.equipment || []).forEach(function (row) {
      const line = el('label', 'loadout-select-row', section);
      el('span', 'loadout-label', line, EQUIPMENT_LABELS[row.slot] || row.slot);
      const select = el('select', 'equipment-select', line);
      fillItemOptions(select, row.itemId, row.options || []);
      select.disabled = locked;
      select.addEventListener('change', function () {
        invokeCommand('setEquipment', {
          loadoutId: plan.id,
          slot: row.slot,
          itemId: select.value || null
        });
      });
    });
  }

  function renderSupplyEditor(parent, plan, locked) {
    const section = el('div', 'loadout-section', parent);
    el('div', 'section-title', section, '补给');
    (plan.supplies || []).forEach(function (row) {
      const line = el('label', 'loadout-select-row', section);
      el('span', 'loadout-label', line, SUPPLY_LABELS[row.slot] || row.slot);
      const select = el('select', 'supply-select', line);
      fillItemOptions(select, row.itemId, row.options || []);
      select.disabled = locked;
      const old = row.config || {};
      let threshold = null;
      if (row.slot !== 'talisman') {
        threshold = el('input', 'supply-threshold', line);
        threshold.type = 'number';
        threshold.min = '5';
        threshold.max = '95';
        threshold.step = '1';
        threshold.value = String(Math.round(
          (Number(old.triggerRatio) || (row.slot === 'food' ? 0.5 : 0.3)) *
            100
        ));
        threshold.disabled = locked;
      }
      const retreatLabel = el('span', 'supply-retreat-label', line);
      const stopWhenEmpty = el(
        'input',
        'supply-stop-when-empty',
        retreatLabel
      );
      stopWhenEmpty.type = 'checkbox';
      stopWhenEmpty.checked = !!old.stopWhenEmpty;
      stopWhenEmpty.disabled = locked;
      el('span', 'supply-retreat-copy', retreatLabel, '耗尽时撤退');

      function save() {
        const config = row.slot === 'talisman'
          ? {
            itemId: select.value || null,
            useAt: 'enemy_start',
            stopWhenEmpty: !!stopWhenEmpty.checked
          }
          : {
            itemId: select.value || null,
            triggerRatio: Math.max(
              5,
              Math.min(95, Math.round(Number(threshold.value) || 5))
            ) / 100,
            stopWhenEmpty: !!stopWhenEmpty.checked
          };
        invokeCommand('setSupply', {
          loadoutId: plan.id,
          slot: row.slot,
          config: config
        });
      }

      select.addEventListener('change', save);
      stopWhenEmpty.addEventListener('change', save);
      if (threshold) {
        threshold.addEventListener('change', function () {
          threshold.value = String(Math.max(
            5,
            Math.min(95, Math.round(Number(threshold.value) || 5))
          ));
          save();
        });
      }
    });
  }

  function techniqueOptions(select, library, kind, selectedId, usedIds) {
    addOption(select, '', '未配置');
    (library || []).filter(function (row) {
      return row.learned &&
        row.kind === kind &&
        (row.id === selectedId || usedIds.indexOf(row.id) < 0);
    }).forEach(function (row) {
      addOption(select, row.id, row.name);
    });
    select.value = selectedId || '';
  }

  function renderActiveTechniques(
    parent,
    plan,
    library,
    conditionOptions,
    editingLocked,
    unlockedCount
  ) {
    const section = el('div', 'loadout-section', parent);
    el('div', 'section-title', section, '主动功法优先级');
    (plan.activeTechniques || []).forEach(function (slot) {
      const slotLocked = editingLocked ||
        slot.slotIndex >= (unlockedCount || plan.activeTechniques.length);
      const card = el(
        'div',
        'technique-slot active-technique-slot' +
          (slotLocked ? ' locked' : ''),
        section
      );
      el(
        'div',
        'slot-number',
        card,
        '优先级 ' + slot.priority +
          (slotLocked ? '（未解锁）' : '')
      );
      const select = el('select', 'technique-select', card);
      const usedIds = (plan.activeTechniques || []).filter(function (other) {
        return other.slotIndex !== slot.slotIndex;
      }).map(function (other) {
        return other.techniqueId;
      }).filter(Boolean);
      techniqueOptions(
        select,
        library,
        'active',
        slot.techniqueId,
        usedIds
      );
      const row = el('div', 'condition-row', card);
      const typeSelect = el('select', 'condition-type', row);
      CONDITION_TYPES.forEach(function (entry) {
        const option = addOption(
          typeSelect,
          entry[0],
          entry[1],
          'condition-type-option'
        );
        if ((entry[0] === 'enemyHasStatus' ||
             entry[0] === 'selfMissingBuff') &&
            conditionOptionRows(entry[0], conditionOptions).length === 0) {
          option.disabled = true;
        }
      });
      const condition = slot.condition || { type: 'always' };
      typeSelect.value = condition.type || 'always';
      const percentCondition = condition.type === 'selfHpBelow' ||
        condition.type === 'enemyHpBelow' ||
        condition.type === 'selfQiAbove';
      const enumeratedCondition = condition.type === 'enemyHasStatus' ||
        condition.type === 'selfMissingBuff';
      let valueInput;
      if (enumeratedCondition) {
        valueInput = el('select', 'condition-option-select', row);
        const options = conditionOptionRows(
          condition.type,
          conditionOptions
        );
        options.forEach(function (option) {
          addOption(valueInput, option.id, option.label);
        });
        const current = conditionValue(condition);
        valueInput.value = options.some(function (option) {
          return option.id === current;
        }) ? current : (options[0] ? options[0].id : '');
        valueInput.disabled = slotLocked || options.length === 0;
      } else {
        valueInput = el('input', 'condition-value', row);
        valueInput.type = 'text';
        valueInput.value = conditionValue(condition);
      }
      if (percentCondition && valueInput.tagName === 'INPUT') {
        valueInput.type = 'number';
        valueInput.min = '1';
        valueInput.max = '100';
      }
      if (!enumeratedCondition) {
        valueInput.disabled = condition.type === 'always' || slotLocked;
      }
      select.disabled = slotLocked;
      typeSelect.disabled = slotLocked;
      function save(nextType, raw) {
        const nextCondition = normalizedCondition(
          nextType,
          raw,
          conditionOptions
        );
        if (!nextCondition) return;
        invokeCommand('setActiveTechnique', {
          loadoutId: plan.id,
          slotIndex: slot.slotIndex,
          techniqueId: select.value || null,
          condition: nextCondition
        });
      }
      select.addEventListener('change', function () {
        save(typeSelect.value, valueInput.value);
      });
      typeSelect.addEventListener('change', function () {
        const nextType = typeSelect.value;
        const options = conditionOptionRows(nextType, conditionOptions);
        let nextValue = '';
        if (nextType === 'selfHpBelow' ||
            nextType === 'enemyHpBelow' ||
            nextType === 'selfQiAbove') {
          nextValue = '50';
        } else if (options.length) {
          nextValue = options[0].id;
        }
        save(nextType, nextValue);
      });
      valueInput.addEventListener('change', function () {
        if (valueInput.type === 'number') {
          valueInput.value = String(Math.max(
            1,
            Math.min(100, Math.round(Number(valueInput.value) || 1))
          ));
        }
        save(typeSelect.value, valueInput.value);
      });
    });
  }

  function renderPassiveTechniques(parent, plan, library, locked) {
    const section = el('div', 'loadout-section', parent);
    el('div', 'section-title', section, '被动功法');
    (plan.passiveTechniques || []).forEach(function (slot) {
      const card = el(
        'div',
        'technique-slot passive-technique-slot',
        section
      );
      el('span', 'slot-number', card, '槽位 ' + (slot.slotIndex + 1));
      const select = el('select', 'technique-select', card);
      const usedIds = (plan.passiveTechniques || []).filter(function (other) {
        return other.slotIndex !== slot.slotIndex;
      }).map(function (other) {
        return other.techniqueId;
      }).filter(Boolean);
      techniqueOptions(
        select,
        library,
        'passive',
        slot.techniqueId,
        usedIds
      );
      select.disabled = locked;
      select.addEventListener('change', function () {
        invokeCommand('setPassiveTechnique', {
          loadoutId: plan.id,
          slotIndex: slot.slotIndex,
          techniqueId: select.value || null
        });
      });
    });
  }

  function renderTechniqueLibrary(parent, view) {
    const section = el('div', 'technique-library', parent);
    el('div', 'section-title', section, '功法藏书');
    const grid = el('div', 'technique-grid', section);
    const rows = view && Array.isArray(view.techniques)
      ? view.techniques
      : [];
    rows.forEach(function (row) {
      const card = el('div', 'card technique-card', grid);
      el('div', 'card-title', card, row.name);
      el(
        'div',
        'technique-book-count',
        card,
        '功法书 ×' + (row.ownedBooks || 0) +
          ' · ' + (row.learned ? '已习得' : '未习得')
      );
      el(
        'div',
        'technique-progress',
        card,
        '等级 ' + (row.level || 0) +
          ' · ' + (row.xp || 0) + '/' + (row.xpNeeded || 0)
      );
      el(
        'div',
        'technique-meta',
        card,
        (row.kind === 'active' ? '主动' : '被动') +
          ' · 标签 ' + (row.tagLabels || []).join('/') +
          ' · 真气 ' + (row.qiCost || 0) +
          ' · 冷却 ' + (row.cooldownTicks || 0)
      );
      el(
        'div',
        'technique-effect',
        card,
        '效果：' + (row.effectText || '无')
      );
      const consume = el(
        'button',
        'small-btn consume-technique-book',
        card,
        row.learned ? '吸收功法书' : '研读功法书'
      );
      consume.disabled = !row.ownedBooks || !row.eligible;
      consume.addEventListener('click', function () {
        invokeCommand('consumeTechniqueBook', { itemId: row.bookItemId });
      });
    });
  }

  function buildTechniques(c) {
    c.classList.add('techniques-page');
    contentState.refs.techniquesHost = el('div', 'techniques-host', c);
    contentState.refs.techniquesSignature = null;
    renderTechniquesView();
  }

  function liveTechniques() {
    renderTechniquesView();
  }

  function firstUnusedPlanName(tabs, maximum) {
    const names = {};
    (tabs || []).forEach(function (tab) {
      if (tab && typeof tab.name === 'string') names[tab.name] = true;
    });
    const limit = Math.max(1, Number(maximum) || 5);
    for (let index = 1; index <= limit; index++) {
      const name = '方案' + index;
      if (!names[name]) return name;
    }
    return '新方案';
  }

  function renderTechniquesView() {
    const host = contentState.refs.techniquesHost;
    if (!host) return;
    const loadouts = safeQuery('combatLoadouts', undefined, {
      tabs: [],
      plans: [],
      canCreate: false,
      maxLoadouts: 5
    });
    const techniques = safeQuery('techniques', undefined, {
      techniques: []
    });
    const inventory = safeQuery(
      'inventory',
      { category: 'all', search: '' },
      { items: [] }
    );
    const tabs = Array.isArray(loadouts.tabs)
      ? loadouts.tabs.slice(0, 5)
      : [];
    if (!tabs.some(function (tab) {
      return tab.id === loadoutUiState.selectedId;
    })) {
      loadoutUiState.selectedId =
        loadouts.activeLoadoutId || (tabs[0] && tabs[0].id) || null;
    }
    const signature = JSON.stringify([
      loadoutUiState.selectedId,
      loadouts,
      techniques,
      inventory
    ]);
    if (contentState.refs.techniquesSignature === signature) return;
    contentState.refs.techniquesSignature = signature;
    host.innerHTML = '';
    const tabBar = el('div', 'loadout-tabs', host);
    tabs.forEach(function (tab) {
      const button = el(
        'button',
        'loadout-tab' +
          (tab.id === loadoutUiState.selectedId ? ' active' : ''),
        tabBar,
        tab.name + (tab.active ? ' · 当前' : '')
      );
      button.addEventListener('click', function () {
        loadoutUiState.selectedId = tab.id;
        renderTechniquesView();
      });
    });
    if (loadouts.canCreate && tabs.length < (loadouts.maxLoadouts || 5)) {
      const add = el('button', 'loadout-tab loadout-add', tabBar, '＋新方案');
      add.addEventListener('click', function () {
        invokeCommand('createCombatLoadout', {
          name: firstUnusedPlanName(tabs, loadouts.maxLoadouts)
        });
      });
    }
    const plans = Array.isArray(loadouts.plans) ? loadouts.plans : [];
    const plan = plans.find(function (row) {
      return row.id === loadoutUiState.selectedId;
    }) || null;
    if (plan) {
      const editor = el('div', 'card loadout-editor', host);
      el('div', 'card-title', editor, plan.name);
      const management = el('div', 'loadout-management', editor);
      const nameInput = el('input', 'loadout-name-input', management);
      nameInput.type = 'text';
      nameInput.value = plan.name;
      nameInput.maxLength = 12;
      nameInput.disabled = !!plan.editingLocked;
      nameInput.addEventListener('change', function () {
        invokeCommand('renameCombatLoadout', {
          loadoutId: plan.id,
          name: nameInput.value
        });
      });
      const activate = el(
        'button',
        'small-btn activate-loadout',
        management,
        plan.active ? '当前方案' : '设为当前方案'
      );
      activate.disabled = !!plan.editingLocked || !!plan.active;
      activate.addEventListener('click', function () {
        invokeCommand('setActiveCombatLoadout', { loadoutId: plan.id });
      });
      const remove = el(
        'button',
        'small-btn delete-loadout',
        management,
        '删除方案'
      );
      remove.disabled = !!plan.editingLocked || plans.length <= 1;
      remove.addEventListener('click', function () {
        invokeCommand('deleteCombatLoadout', { loadoutId: plan.id });
      });
      if (plan.editingLocked) {
        el(
          'div',
          'loadout-lock-message',
          editor,
          '当前战斗方案正在使用，战斗中不可编辑'
        );
      }
      renderEquipmentEditor(editor, plan, !!plan.editingLocked);
      renderSupplyEditor(editor, plan, !!plan.editingLocked);
      renderActiveTechniques(
        editor,
        plan,
        techniques.techniques || [],
        loadouts.conditionOptions || {},
        !!plan.editingLocked,
        loadouts.unlockedActiveSlots
      );
      renderPassiveTechniques(
        editor,
        plan,
        techniques.techniques || [],
        !!plan.editingLocked
      );
    } else {
      el('div', 'placeholder', host, '暂无战斗方案');
    }
    renderTechniqueLibrary(host, techniques);
  }

  function buildPlaceholder(navName, c) {
    const tips = {
      '商城': '商城筹建中 · 敬请期待',
      '探索': '探索玩法筹建中'
    };
    el('div', 'placeholder', c, tips[navName] || '（该功能暂未开放）');
  }

  function goToNavigation(label) {
    const navigation = api().queries.navigation();
    const index = navigation.items.findIndex(function (item) {
      return item.label === label;
    });
    if (index >= 0) invokeCommand('switchNav', { index: index });
  }

  function buildSects(c) {
    const refs = contentState.refs;
    if (!api().queries.sects) {
      buildReserve(c, 'reserve-stage4', '宗门', '宗门系统尚未开放');
      return;
    }
    refs.sectStatus = el('div', 'card sect-status', c);
    refs.sectHost = el('div', 'sect-list', c);
  }

  function liveSects() {
    const refs = contentState.refs;
    if (!refs.sectHost) return;
    const view = api().queries.sects();
    const details = view.sects.map(function (sect) {
      return api().queries.sect({ sectId: sect.id });
    });
    const signature = JSON.stringify([view, details]);
    if (refs.sectSignature === signature) return;
    refs.sectSignature = signature;
    refs.sectStatus.innerHTML = '';
    el(
      'div',
      'card-title',
      refs.sectStatus,
      view.wandering ? '当前身份：散修' : '当前宗门：' + view.currentSectName
    );
    el(
      'div',
      'muted',
      refs.sectStatus,
      '加入、离开或更换宗门都通过事件中的选择完成'
    );
    const eventButton = el(
      'button',
      'small-btn sect-event-link',
      refs.sectStatus,
      '前往事件'
    );
    eventButton.addEventListener('click', function () {
      eventUiState.section = 'pending';
      goToNavigation('事件');
    });
    refs.sectHost.innerHTML = '';
    details.forEach(function (sect) {
      const card = el('div', 'card sect-card', refs.sectHost);
      el('div', 'card-title', card, sect.name);
      el('div', 'sect-description', card, sect.description);
      el(
        'div',
        'sect-traits',
        card,
        '特色：' + sect.traits.join(' · ')
      );
      el(
        'div',
        'sect-resources',
        card,
        '常见资源：' + sect.favoredResources.join(' · ')
      );
      el(
        'div',
        'sect-power',
        card,
        '势力 ' + sect.power + ' · 名望 ' + sect.reputation +
          ' · 门人 ' + sect.memberCount
      );
      el(
        'div',
        'sect-stance',
        card,
        '关系：结盟 ' + sect.stanceCounts.allied +
          ' · 中立 ' + sect.stanceCounts.neutral +
          ' · 竞争 ' + sect.stanceCounts.competitive +
          ' · 敌对 ' + sect.stanceCounts.hostile
      );
      el(
        'div',
        'sect-leader',
        card,
        '领袖：' + (sect.leader ? sect.leader.name : '暂缺')
      );
      if (sect.joined) {
        el(
          'div',
          'sect-player-stats',
          card,
          '你的贡献 ' + sect.contribution +
            ' · 宗门声望 ' + sect.playerReputation
        );
      }
    });
  }

  function buildWorld(c) {
    const refs = contentState.refs;
    if (!api().queries.world) {
      buildReserve(c, 'reserve-stage4', '天下', '天下演变尚未开放');
      return;
    }
    refs.worldTools = el('div', 'world-tools', c);
    refs.worldScope = el('div', 'world-filter', refs.worldTools);
    [
      ['nearby', '身边动态'],
      ['all', '天下传闻']
    ].forEach(function (entry) {
      const button = el('button', 'filter-chip', refs.worldScope, entry[1]);
      button.datasetScope = entry[0];
      button.addEventListener('click', function () {
        worldUiState.scope = entry[0];
        refs.worldSignature = null;
        renderWorldPage();
      });
    });
    refs.worldRegion = el('select', 'world-region-select', refs.worldTools);
    refs.worldRegion.addEventListener('change', function (event) {
      worldUiState.regionId = event.target.value;
      refs.worldSignature = null;
      renderWorldPage();
    });
    refs.worldHost = el('div', 'world-page', c);
  }

  function liveWorld() {
    renderWorldPage();
  }

  function renderWorldPage() {
    const refs = contentState.refs;
    if (!refs.worldHost) return;
    const view = api().queries.world({
      scope: worldUiState.scope,
      regionId: worldUiState.regionId
    });
    if (!worldUiState.regionId) worldUiState.regionId = view.regionId;
    const signature = JSON.stringify(view);
    if (refs.worldSignature === signature) return;
    refs.worldSignature = signature;
    refs.worldRegion.innerHTML = '';
    view.filters.regions.forEach(function (region) {
      addOption(refs.worldRegion, region.id, region.name);
    });
    refs.worldRegion.value = view.regionId;
    Array.prototype.forEach.call(refs.worldScope.children, function (button) {
      button.classList.toggle(
        'active',
        button.datasetScope === view.scope
      );
    });
    refs.worldHost.innerHTML = '';
    const regionSection = el('section', 'world-section', refs.worldHost);
    el('div', 'section-title', regionSection, '地区');
    const regionList = el('div', 'region-list', regionSection);
    view.regions.forEach(function (region) {
      const card = el('div', 'card region-card', regionList);
      el('div', 'card-title', card, region.name);
      el('div', 'muted', card, region.description);
      el('div', 'region-population', card, '在此活动：' +
        region.peopleCount + ' 人');
    });
    const peopleSection = el('section', 'world-section', refs.worldHost);
    el('div', 'section-title', peopleSection, '人物');
    const peopleList = el('div', 'world-people', peopleSection);
    view.people.forEach(function (person) {
      const card = el('div', 'world-person-card', peopleList);
      el('span', 'world-person-name', card, person.name);
      el(
        'span',
        'world-person-meta',
        card,
        person.realm + ' · ' + person.sectName
      );
    });
    if (!view.people.length) {
      el('div', 'muted', peopleList, '这处暂时没有熟悉的人');
    }
    const sectSection = el('section', 'world-section', refs.worldHost);
    el('div', 'section-title', sectSection, '宗门');
    view.sects.forEach(function (sect) {
      el(
        'div',
        'world-sect-card',
        sectSection,
        sect.name + ' · 势力 ' + sect.power + ' · 名望 ' +
          sect.reputation
      );
    });
    const familySection = el('section', 'world-section', refs.worldHost);
    el('div', 'section-title', familySection, '家族与居所');
    view.families.forEach(function (family) {
      el(
        'div',
        'family-card',
        familySection,
        family.id + ' · ' + family.count + ' 人 · ' +
          family.names.join('、')
      );
    });
    const feed = el('section', 'world-section world-feed', refs.worldHost);
    el('div', 'section-title', feed, '最近变化');
    view.recent.forEach(function (entry) {
      el('div', 'world-feed-row', feed, entry.title);
    });
    if (!view.recent.length) {
      el('div', 'muted', feed, '最近风平浪静');
    }
  }

  function buildEvents(c) {
    const refs = contentState.refs;
    const initialView = api().queries.events();
    if (initialView.stage4Available !== true) {
      el('div', 'card-title', c, '最近离线结算');
      refs.offlineReports = el('div', 'event-offline-reports', c);
      buildReserve(
        c,
        'reserve-stage4',
        '事件',
        '人物事件与世界演变将在人物与事件阶段开放'
      );
      return;
    }
    refs.eventTabs = el('div', 'section-tabs', c);
    refs.eventHost = el('div', 'event-list', c);
    [
      ['summary', '事件摘要'],
      ['pending', '待决策'],
      ['world', '世界演变']
    ].forEach(function (entry) {
      const button = el('button', 'section-tab', refs.eventTabs);
      button.datasetSection = entry[0];
      button.addEventListener('click', function () {
        eventUiState.section = entry[0];
        refs.eventSignature = null;
        renderEventSection();
      });
      el('span', 'section-tab-label', button, entry[1]);
      button._badge = el('span', 'section-badge', button, '0');
    });
    refs.worldFilters = el('div', 'world-filter', c);
    [
      ['nearby', '身边动态'],
      ['all', '天下传闻']
    ].forEach(function (entry) {
      const button = el('button', 'filter-chip', refs.worldFilters, entry[1]);
      button.addEventListener('click', function () {
        eventUiState.filter = entry[0];
        refs.eventSignature = null;
        renderEventSection();
      });
      button.datasetFilter = entry[0];
    });
  }

  function telemetryCountText(rows, prefix, amountPrefix) {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return prefix + rows.map(function (row) {
      return row.name + ' ' + amountPrefix + row.count;
    }).join(' · ');
  }

  function renderCombatTelemetry(parent, report) {
    const combat = report && report.combat;
    const display = report && report.display;
    if (!combat || !display) return;
    const lines = [
      telemetryCountText(display.enemiesDefeated, '击败：', '×'),
      telemetryCountText(display.dungeonClears, '副本通关：', '×')
    ];
    if (combat.damageDealt || combat.damageTaken) {
      lines.push(
        '伤害：造成 ' + (combat.damageDealt || 0) +
          ' · 承受 ' + (combat.damageTaken || 0)
      );
    }
    lines.push(
      telemetryCountText(display.suppliesUsed, '补给：', '×'),
      telemetryCountText(display.loot, '战利品：', '×')
    );
    if (display.pendingLoot) lines.push('战利品待领取');
    if (display.retreat) lines.push(display.retreat);
    lines.push(
      telemetryCountText(display.techniqueXp, '功法经验：', '+')
    );
    lines.filter(Boolean).forEach(function (text) {
      el('div', 'combat-report-line', parent, text);
    });
  }

  function liveEvents() {
    const box = contentState.refs.offlineReports;
    if (!box) {
      renderEventSection();
      return;
    }
    box.innerHTML = '';
    const reports = api().queries.events().offlineReports;
    if (!reports.length) {
      el('div', 'placeholder', box, '尚无');
      return;
    }
    reports.forEach(function (report) {
      const card = el('div', 'card event-report', box);
      el('div', 'card-title', card, report.title);
      el(
        'div',
        'event-duration',
        card,
        report.immediate
          ? (report.durationLabel || '即时完成')
          : (report.durationLabel || '离线时长') +
            '：' + fmtDur(report.durationSeconds)
      );
      el(
        'div',
        'event-action',
        card,
        report.action.label + ' 完成 ' + report.action.completed + ' 次'
      );
      el(
        'div',
        'event-stop',
        card,
        '停止原因：' + (report.action.stopLabel || '无')
      );
      renderCombatTelemetry(card, report);
    });
  }

  function renderEventSection() {
    const refs = contentState.refs;
    if (!refs.eventHost) return;
    const view = api().queries.events({
      section: eventUiState.section,
      filter: eventUiState.filter
    });
    const signature = JSON.stringify(view);
    if (refs.eventSignature === signature) return;
    refs.eventSignature = signature;
    Array.prototype.forEach.call(refs.eventTabs.children, function (button) {
      const section = button.datasetSection;
      button.classList.toggle('active', section === view.section);
      const unread = view.unreadCounts[section] || 0;
      button._badge.textContent = String(view.counts[section] || 0);
      button._badge.classList.toggle('unread', unread > 0);
    });
    refs.worldFilters.style.display =
      view.section === 'world' ? 'flex' : 'none';
    Array.prototype.forEach.call(
      refs.worldFilters.children,
      function (button) {
        button.classList.toggle(
          'active',
          button.datasetFilter === view.filter
        );
      }
    );
    refs.eventHost.innerHTML = '';
    if (!view.items.length) {
      el(
        'div',
        'placeholder',
        refs.eventHost,
        view.section === 'pending'
          ? '眼下没有需要你决定的事情'
          : '这一栏还没有记录'
      );
    }
    view.items.forEach(function (row) {
      const card = el('div', 'card event-card', refs.eventHost);
      el('div', 'card-title', card, row.title);
      if (row.body) el('div', 'event-body', card, row.body);
      if (row.participants && row.participants.length) {
        el(
          'div',
          'event-people',
          card,
          '相关人物：' + row.participants.map(function (person) {
            return person.name;
          }).join('、')
        );
      }
      if (row.report) {
        el(
          'div',
          'event-duration',
          card,
          row.report.durationLabel || '离线结算'
        );
        if (row.report.action) {
          el(
            'div',
            'event-action',
            card,
            row.report.action.label + ' 完成 ' +
              row.report.action.completed + ' 次'
          );
        }
        renderCombatTelemetry(card, row.report);
      }
      if (row.options) {
        row.options.forEach(function (option) {
          const optionRow = el('div', 'event-option', card);
          const copy = el('div', 'event-option-copy', optionRow);
          el('div', 'event-option-label', copy, option.label);
          if (option.preview) {
            el('div', 'muted', copy, option.preview);
          }
          const button = el('button', 'event-option-button', optionRow, '选择');
          button.addEventListener('click', function () {
            invokeCommand('chooseEvent', {
              eventId: row.id,
              optionId: option.id
            });
          });
        });
      }
    });
    api().commands.markEventSectionRead({
      section: view.section,
      ids: view.items.map(function (row) { return row.id; })
    });
  }

  // ============================================================
  // 弹窗
  // ============================================================
  function toggleModal(name, show, buildFn, updateFn) {
    const m = modals[name]; if (!m) return;
    if (show) {
      if (!m.built) { buildFn(m); m.built = true; }
      m.root.style.display = 'flex'; updateFn(m);
    } else {
      m.root.style.display = 'none';
    }
  }

  function buildBreak(m) {
    const a = api();
    const modal = el('div', 'modal', m.root);
    el('div', 'modal-title', modal, '境界突破');
    const close = el('button', 'modal-close', modal, '×');
    close.addEventListener('click', () => a.commands.closeBreak());
    const body = el('div', 'modal-body breakthrough-data', modal);
    const realmEl = el('div', 'bk-realm', body, '');
    const gateEl = el('div', 'cond', body, '');
    const cultivationEl = el('div', 'cond', body, '');
    const baseEl = el('div', 'break-source', body, '');
    const pillRow = el('label', 'break-pill-row', body);
    const pillEl = el('span', 'break-source', pillRow, '');
    const pillSelect = el('select', 'break-pill-select', pillRow);
    const eventEl = el('div', 'break-source', body, '');
    const finalEl = el('div', 'break-final', body, '');
    const failureEl = el('div', 'break-failure', body, '');
    const btn = el('button', 'big-btn', body, '突破');
    m.selectedPillQuantity = 0;
    pillSelect.addEventListener('change', function () {
      m.selectedPillQuantity = Math.max(
        0,
        Math.min(2, Math.round(Number(pillSelect.value) || 0))
      );
      updateBreak(m);
    });
    btn.addEventListener('click', function () {
      const info = safeQuery('breakthrough', undefined, null);
      if (!info || !info.ok || !info.ready ||
          safeQuery('persistence', undefined, { locked: true }).locked) {
        return;
      }
      const quantity = m.selectedPillQuantity || 0;
      invokeCommand('attemptBreakthrough', {
        pillItemId: quantity > 0 && info.pill
          ? info.pill.itemId
          : null,
        quantity: quantity
      });
    });
    m.refs = {
      realmEl,
      gateEl,
      cultivationEl,
      baseEl,
      pillEl,
      pillSelect,
      eventEl,
      finalEl,
      failureEl,
      btn
    };
  }
  function updateBreak(m) {
    const baseInfo = safeQuery('breakthrough', undefined, null);
    let info = baseInfo;
    if (baseInfo && baseInfo.ok) {
      const maximum = baseInfo.pill
        ? Math.min(2, baseInfo.pill.maxSelectable || 0)
        : 0;
      const quantity = Math.min(
        m.selectedPillQuantity || 0,
        maximum
      );
      m.selectedPillQuantity = quantity;
      info = safeQuery('breakthrough', {
        pillItemId: quantity > 0 && baseInfo.pill
          ? baseInfo.pill.itemId
          : null,
        quantity: quantity
      }, null);
    }
    const r = m.refs;
    if (!info || !info.ok) {
      m.breakReady = false;
      r.realmEl.textContent = '突破数据暂不可用';
      r.gateEl.textContent = '永久门槛：未完成（0/0）';
      r.cultivationEl.textContent = '修为：0/0';
      r.baseEl.textContent = '基础概率：0%';
      r.pillEl.textContent = '所选丹药加成：0%';
      r.eventEl.textContent = '事件增益：0%';
      r.finalEl.textContent = '最终概率：0%';
      r.failureEl.textContent =
        '失败：修为清空；门槛保留；本次丹药消耗';
      r.pillSelect.innerHTML = '';
      addOption(r.pillSelect, '0', '不使用丹药');
      r.btn.disabled = true;
      r.btn.classList.add('disabled');
      return;
    }
    const gate = info.gate;
    const progress = gate && gate.progress || {
      current: gate && gate.completed ? gate.count : 0,
      required: gate ? gate.count : 0
    };
    r.realmEl.textContent =
      (info.currentRealm ? info.currentRealm.name : '当前境界') +
      ' → ' +
      (info.nextRealm ? info.nextRealm.name : '最高境界');
    r.gateEl.textContent =
      '永久门槛：' + (gate && gate.completed ? '完成' : '未完成') +
      '（' + progress.current + '/' + progress.required + '）';
    r.gateEl.className = 'cond' + (
      gate && gate.completed ? ' ok' : ' bad'
    );
    r.cultivationEl.textContent =
      '修为：' + (info.cultivation || 0) +
      '/' + (info.cultivationNeed || 0);
    r.cultivationEl.className =
      'cond' + (info.cultivationMet ? ' ok' : ' bad');
    const quantity = Math.min(
      m.selectedPillQuantity || 0,
      info.pill ? Math.min(2, info.pill.maxSelectable || 0) : 0
    );
    m.selectedPillQuantity = quantity;
    r.pillSelect.innerHTML = '';
    addOption(r.pillSelect, '0', '不使用丹药');
    const maximum = info.pill
      ? Math.min(2, info.pill.maxSelectable || 0)
      : 0;
    for (let count = 1; count <= maximum; count++) {
      addOption(
        r.pillSelect,
        String(count),
        (info.pill.name || '未知丹药') + ' ×' + count
      );
    }
    r.pillSelect.value = String(quantity);
    r.pillSelect.disabled = maximum === 0;
    r.baseEl.textContent = '基础概率：' + percentText(info.baseChance);
    r.pillEl.textContent = '所选丹药加成：' + percentText(
      info.pill ? info.pill.bonus : 0
    );
    r.eventEl.textContent = '事件增益：' + percentText(info.eventBonus);
    r.finalEl.textContent = '最终概率：' + percentText(info.finalChance);
    r.failureEl.textContent =
      '失败：修为清空；门槛保留；本次丹药消耗';
    m.breakReady = !!info.ready;
    r.btn.disabled = !info.ready;
    r.btn.classList.toggle('disabled', !info.ready);
  }

  function buildOffline(m) {
    const a = api();
    const modal = el('div', 'modal', m.root);
    el('div', 'modal-title', modal, '离线收益');
    const body = el('div', 'modal-body', modal);
    const dur = el('div', 'off-dur', body, '');
    const listBox = el('div', 'off-list', body);
    const btn = el('button', 'big-btn', body, '领取');
    btn.addEventListener('click', () => {
      if (a.queries.persistence().locked) return;
      const reports = a.queries.offline().reports;
      invokeCommand('acknowledgeOffline', {
        reportIds: reports.map(report => report.id)
      });
    });
    m.refs = { dur, listBox, btn };
  }
  function updateOffline(m) {
    const a = api(); const r = m.refs;
    const offline = a.queries.offline();
    r.dur.textContent = '你离开了 ' +
      fmtDur(offline.summary.durationSeconds);
    r.listBox.innerHTML = '';
    const actions = offline.summary.actions;
    if (actions.length === 0) {
      el('div', 'off-empty', r.listBox, '（无产出）');
    } else {
      for (const action of actions) {
        el('div', 'off-item', r.listBox,
          action.label + ' ×' + action.completed);
      }
    }
    renderCombatTelemetry(r.listBox, offline.summary);
  }

  function buildLunhui(m) {
    const a = api();
    const modal = el('div', 'modal', m.root);
    el('div', 'modal-title', modal, '寿元已尽');
    const body = el('div', 'modal-body', modal);
    el('div', 'lh-text', body, '未及突破，道消身陨，入轮回重修');
    el('div', 'lh-sub', body, '（形象保留，修为/境界/资源重置至练气一层）');
    const btn = el('button', 'big-btn', body, '入轮回');
    btn.addEventListener('click', () => {
      if (!a.queries.persistence().locked) {
        invokeCommand('enterLegacyRebirth');
      }
    });
    m.refs = { btn };
  }
  function updateLunhui() { /* 静态内容 */ }

  function buildLifespanBuffer(m) {
    const a = api();
    const modal = el('div', 'modal', m.root);
    el('div', 'modal-title', modal, '寿元将尽');
    const close = el('button', 'modal-close', modal, '×');
    close.addEventListener('click', () => invokeCommand('closeLifespanBuffer'));
    const body = el('div', 'modal-body', modal);
    const text = el('div', 'lh-text', body, '');
    const sub = el('div', 'lh-sub', body, '');
    el('div', 'buffer-warning', body,
      '进入安全缓冲后，当前进行的动作已停止，社交与宗门类行动已锁定。');
    const actions = el('div', 'legacy-actions', body);
    const go = el('button', 'big-btn', actions, '开始人生转换');
    go.addEventListener('click', function () {
      invokeCommand('closeLifespanBuffer');
      if (!a.queries.persistence().locked) {
        invokeCommand('beginLegacyTransition', { cause: 'voluntary' });
      }
    });
    const later = el('button', 'small-btn legacy-cancel', actions, '稍后处理');
    later.addEventListener('click', () => invokeCommand('closeLifespanBuffer'));
    m.refs = { text: text, sub: sub };
  }
  function updateLifespanBuffer(m) {
    const a = api();
    const hall = a.queries.inheritanceHall
      ? a.queries.inheritanceHall({ section: 'overview' })
      : null;
    if (hall && hall.implemented && hall.lifespan) {
      const rem = hall.lifespan.remainingYears != null
        ? hall.lifespan.remainingYears : 1;
      const max = hall.lifespan.maxYears != null
        ? hall.lifespan.maxYears : '?';
      const age = hall.ageYears != null ? hall.ageYears : '?';
      m.refs.text.textContent =
        '你的寿元已耗尽（剩余 ' + rem + '/' + max + ' 年），进入安全缓冲。';
      m.refs.sub.textContent =
        '当前年龄 ' + age + ' 岁 · 请完成传承或创建新身份';
    } else {
      m.refs.text.textContent = '你的寿元已耗尽，进入安全缓冲。';
      m.refs.sub.textContent = '请完成传承或创建新身份，开启下一段人生';
    }
  }

  function buildLegacyTransition(m) {
    const modal = el('div', 'modal legacy-modal', m.root);
    m.refs = {
      title: el('div', 'modal-title', modal, '人生转换'),
      body: el('div', 'modal-body legacy-transition-body', modal)
    };
    m.signature = null;
  }

  function updateLegacyTransition(m) {
    const a = api();
    const view = a.queries.legacyTransition();
    const pending = view && view.pending;
    if (!pending) return;
    const hall = a.queries.inheritanceHall({ section: 'descendants' });
    const descendants = hall && Array.isArray(hall.descendants)
      ? hall.descendants
      : [];
    const signature = JSON.stringify([view, descendants]);
    if (m.signature === signature) return;
    m.signature = signature;
    const body = m.refs.body;
    body.innerHTML = '';
    m.refs.title.textContent = pending.cause === 'lifespan'
      ? '寿元将尽 · 选择下一段人生'
      : '主动开始下一段人生';
    el(
      'div',
      'legacy-preview',
      body,
      '十二项生活技能等级与经验保留；修为与本世临时状态重置'
    );
    if (pending.cause === 'lifespan') {
      el(
        'div',
        'buffer-warning',
        body,
        '寿元流程已经开始，必须选择一条人生路线，无法取消。'
      );
    }

    const routes = el('div', 'legacy-routes', body);
    const eligible = {};
    (view.eligibleHeirIds || []).forEach(function (npcId) {
      eligible[npcId] = true;
    });
    const heirs = descendants.filter(function (person) {
      return eligible[person.npcId];
    });
    if (heirs.length) {
      el('div', 'legacy-route-title', routes, '由成年后代接续');
      heirs.forEach(function (person) {
        const button = el(
          'button',
          'legacy-route' +
            (pending.route === 'descendant' &&
             pending.heirNpcId === person.npcId ? ' active' : ''),
          routes,
          person.name + ' · ' + person.ageYears + ' 岁 · 可继承'
        );
        button.addEventListener('click', function () {
          invokeCommand('chooseLegacyRoute', {
            route: 'descendant',
            heirNpcId: person.npcId
          });
        });
      });
    } else {
      el('div', 'muted', routes, '当前没有可继承的成年后代');
    }
    const newIdentity = el(
      'button',
      'legacy-route' +
        (pending.route === 'newIdentity' ? ' active' : ''),
      routes,
      '创建新身份'
    );
    newIdentity.addEventListener('click', function () {
      invokeCommand('chooseLegacyRoute', { route: 'newIdentity' });
    });

    if (pending.route === 'newIdentity') {
      const draftCard = el('div', 'legacy-preview legacy-draft', body);
      el('div', 'card-title', draftCard, '新身份');
      const name = el('input', 'legacy-name-input', draftCard);
      name.type = 'text';
      name.maxLength = 12;
      name.placeholder = '输入新名字';
      name.value = pending.draft && pending.draft.name || '';
      const origin = el('select', 'legacy-origin-select', draftCard);
      (view.origins || []).forEach(function (row) {
        addOption(origin, row.id, row.name);
      });
      origin.value = pending.draft && pending.draft.originId ||
        'wanderingReborn';
      const saveDraft = el(
        'button',
        'small-btn legacy-draft-save',
        draftCard,
        '保存新身份'
      );
      saveDraft.addEventListener('click', function () {
        invokeCommand('updateNewIdentityDraft', {
          name: name.value,
          originId: origin.value,
          personalityId: pending.draft.personalityId,
          talentId: pending.draft.talentId,
          appearance: pending.draft.appearance
        });
      });
    }

    const actions = el('div', 'legacy-actions', body);
    const confirm = el(
      'button',
      'big-btn legacy-confirm',
      actions,
      '确认进入下一段人生'
    );
    confirm.disabled = !pending.route ||
      (pending.route === 'newIdentity' &&
       !(pending.draft && pending.draft.name));
    confirm.classList.toggle('disabled', confirm.disabled);
    confirm.addEventListener('click', function () {
      invokeCommand('confirmLegacyTransition');
    });
    if (pending.cause === 'voluntary') {
      const cancel = el(
        'button',
        'small-btn legacy-cancel',
        actions,
        '取消'
      );
      cancel.addEventListener('click', function () {
        invokeCommand('cancelLegacyTransition');
      });
    }
  }

  function syncModals() {
    const a = api();
    const modalsView = a.queries.app().modals;
    toggleModal('break', modalsView.break, buildBreak, updateBreak);
    toggleModal('offline', modalsView.offline, buildOffline, updateOffline);
    toggleModal(
      'lunhui',
      modalsView.legacyRebirth,
      buildLunhui,
      updateLunhui
    );
    toggleModal(
      'lifespanBuffer',
      modalsView.lifespanBuffer,
      buildLifespanBuffer,
      updateLifespanBuffer
    );
    let legacy = a.queries.legacyTransition
      ? a.queries.legacyTransition()
      : null;
    toggleModal(
      'legacy',
      !!(legacy && legacy.pending),
      buildLegacyTransition,
      updateLegacyTransition
    );
    syncFarmPlotModal();
  }

  function updatePersistenceStatus() {
    const a = api();
    if (!a || !persistenceUi) return;
    const status = a.queries.persistence();
    persistenceUi.root.style.display = status.locked ? 'flex' : 'none';
    persistenceUi.message.textContent = status.message || '保存失败，请重试';
    persistenceUi.retry.disabled = !status.canRetry;
    if (shell.topbar && shell.topbar.breakBtn) {
      shell.topbar.breakBtn.disabled = status.locked;
    }
    if (confirmBtn) confirmBtn.disabled = status.locked;
    for (const control of creatorProgressControls) {
      control.disabled = status.locked;
    }
    if (modals.break.built && modals.break.refs.btn) {
      const breakDisabled = status.locked || !modals.break.breakReady;
      modals.break.refs.btn.disabled = breakDisabled;
      modals.break.refs.btn.classList.toggle('disabled', breakDisabled);
    }
    if (modals.offline.built && modals.offline.refs.btn) {
      modals.offline.refs.btn.disabled = status.locked;
    }
    if (modals.lunhui.built && modals.lunhui.refs &&
        modals.lunhui.refs.btn) {
      modals.lunhui.refs.btn.disabled = status.locked;
    }
    if (shell.content) {
      const controls = shell.content.find
        ? shell.content.find(function (element) {
          return element.classList &&
            element.classList.contains('action-card');
        })
        : shell.content.querySelectorAll
          ? shell.content.querySelectorAll('.action-card')
          : [];
      for (const control of controls) {
        control.classList.toggle('disabled', status.locked);
      }
    }
  }

  // ============================================================
  // 主游戏渲染入口（每帧由 game.js 调用）
  // ============================================================
  function renderGame() {
    const a = api(); if (!a) return;
    if (!shell.built) buildShell();
    updatePersistenceStatus();
    const app = a.queries.app();
    if (app.phase !== 'game') {
      hideShell();
      if (app.phase === 'create' || app.phase === 'edit') {
        showCreator(app.phase === 'create');
      }
      updatePersistenceStatus();
      return;
    }
    showShell();
    hideCreator();
    refreshAvatar();
    updateTopbar();
    updateActionBar();
    updateNavActive();
    updateContent();
    syncModals();
    updatePersistenceStatus();
  }

  // ============================================================
  // 角色创建 / 编辑页（试点，已落地）
  // ============================================================
  function build() {
    if (created) return;
    const a = api(); if (!a) { console.warn('[ui] GameAPI 未就绪'); return; }
    card = document.createElement('div');
    card.className = 'creator-card';
    titleEl = document.createElement('h2'); titleEl.className = 'creator-title';
    card.appendChild(titleEl);
    const pw = document.createElement('div'); pw.className = 'preview-wrap';
    previewCanvas = document.createElement('canvas'); previewCanvas.className = 'preview';
    pw.appendChild(previewCanvas); card.appendChild(pw);
    const rnd = document.createElement('button'); rnd.className = 'btn btn-random';
    rnd.textContent = '随机生成';
    rnd.addEventListener('click', () => {
      a.commands.randomizeAppearance();
      refresh();
    });
    creatorProgressControls.push(rnd);
    card.appendChild(rnd);
    const selBox = document.createElement('div'); selBox.className = 'sel-box';
    for (const c of CATS) {
      const row = document.createElement('div'); row.className = 'sel-row';
      const label = document.createElement('div'); label.className = 'sel-label'; label.textContent = CAT_LABEL[c];
      const left = document.createElement('button'); left.className = 'sel-arrow'; left.textContent = '‹';
      left.addEventListener('click', () => {
        a.commands.stepAppearance({ part: c, delta: -1 });
        refresh();
      });
      creatorProgressControls.push(left);
      const idx = document.createElement('div'); idx.className = 'sel-index'; idx.textContent = '1';
      const right = document.createElement('button'); right.className = 'sel-arrow'; right.textContent = '›';
      right.addEventListener('click', () => {
        a.commands.stepAppearance({ part: c, delta: 1 });
        refresh();
      });
      creatorProgressControls.push(right);
      row.appendChild(label); row.appendChild(left); row.appendChild(idx); row.appendChild(right);
      selBox.appendChild(row); selIndexEls[c] = idx;
    }
    card.appendChild(selBox);
    confirmBtn = document.createElement('button'); confirmBtn.className = 'btn btn-confirm';
    confirmBtn.addEventListener('click', onConfirm);
    creatorProgressControls.push(confirmBtn);
    card.appendChild(confirmBtn);
    root.appendChild(card);
    previewCtx = previewCanvas.getContext('2d');
    created = true;
  }
  function onConfirm() {
    const a = api();
    const saved = isCreateMode
      ? a.commands.confirmCreate()
      : a.commands.saveAppearance();
    updatePersistenceStatus();
    if (saved.ok) hideCreator();
  }
  function refresh() {
    const a = api(); if (!a) return;
    updatePersistenceStatus();
    const indices = a.queries.app().appearance.indices;
    for (const c of CATS) {
      if (selIndexEls[c]) {
        selIndexEls[c].textContent = String((indices[c] || 0) + 1);
      }
    }
    refreshPreview();
  }
  function refreshPreview() {
    const a = api(); if (!previewCanvas || !a) return;
    a.render.drawCharacter(previewCanvas);
  }
  function showCreator(isCreate) {
    isCreateMode = !!isCreate; build();
    if (!created) return;
    hideShell();
    titleEl.textContent = isCreate ? '创建角色' : '编辑形象';
    confirmBtn.textContent = isCreate ? '确认创建 · 开始修行' : '保存并返回';
    card.style.display = 'flex'; refresh();
  }
  function hideCreator() { if (card) card.style.display = 'none'; }

  function removeToastNode(node) {
    if (!node) return;
    if (typeof node.remove === 'function') {
      node.remove();
    } else if (node.parentNode && node.parentNode.removeChild) {
      node.parentNode.removeChild(node);
    } else if (node.parent && Array.isArray(node.parent.children)) {
      const index = node.parent.children.indexOf(node);
      if (index >= 0) node.parent.children.splice(index, 1);
    }
  }

  function showToast(msg) {
    if (!toastStack) return;
    const text = String(msg == null ? '' : msg).trim();
    if (!text) return;
    while (toastStack.children && toastStack.children.length >= 3) {
      removeToastNode(toastStack.children[0]);
    }
    const item = el('div', 'toast show', toastStack, text);
    setTimeout(function () {
      if (item.classList) item.classList.remove('show');
      removeToastNode(item);
    }, 1800);
  }

  function init() {
    root = document.getElementById('ui');
    if (!root) console.warn('[ui] 找不到 #ui 容器');
    buildShell();
  }

  // 对外接口
  window.UI = { init, showCreator, hideCreator, refresh, refreshPreview, renderGame, showToast, hideShell, showShell };
  init();
})();
