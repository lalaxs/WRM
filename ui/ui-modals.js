// ============================================================
// ui-modals.js — XiuxianUi page module (classic script, no bundler)
// ============================================================
(function () {
  var Ui = window.XiuxianUi = window.XiuxianUi || {};
    'use strict';

  function toggleModal(name, show, buildFn, updateFn) {
    const m = Ui.modals[name]; if (!m) return;
    if (show) {
      if (!m.built) { buildFn(m); m.built = true; }
      if (m.root.style.display !== 'flex') m.root.style.display = 'flex';
      updateFn(m);
    } else if (m.root.style.display !== 'none') {
      m.root.style.display = 'none';
    }
  }

  function buildBreak(m) {
    const a = Ui.api();
    const modal = Ui.el('div', 'modal', m.root);
    Ui.el('div', 'modal-title', modal, '境界突破');
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', () => a.commands.closeBreak());
    const body = Ui.el('div', 'modal-body breakthrough-data', modal);
    const realmEl = Ui.el('div', 'bk-realm', body, '');
    const gateEl = Ui.el('div', 'cond', body, '');
    const cultivationEl = Ui.el('div', 'cond', body, '');
    const baseEl = Ui.el('div', 'break-source', body, '');
    const pillRow = Ui.el('label', 'break-pill-row', body);
    const pillEl = Ui.el('span', 'break-source', pillRow, '');
    const pillSelect = Ui.el('select', 'break-pill-select', pillRow);
    const eventEl = Ui.el('div', 'break-source', body, '');
    const finalEl = Ui.el('div', 'break-final', body, '');
    const failureEl = Ui.el('div', 'break-failure', body, '');
    const btn = Ui.el('button', 'big-btn', body, '突破');
    m.selectedPillQuantity = 0;
    pillSelect.addEventListener('change', function () {
      m.selectedPillQuantity = Math.max(
        0,
        Math.min(2, Math.round(Number(pillSelect.value) || 0))
      );
      Ui.updateBreak(m);
    });
    btn.addEventListener('click', function () {
      const info = Ui.safeQuery('breakthrough', undefined, null);
      if (!info || !info.ok || !info.ready ||
          Ui.safeQuery('persistence', undefined, { locked: true }).locked) {
        return;
      }
      const quantity = m.selectedPillQuantity || 0;
      Ui.invokeCommand('attemptBreakthrough', {
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
    const baseInfo = Ui.safeQuery('breakthrough', undefined, null);
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
      info = Ui.safeQuery('breakthrough', {
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
      Ui.addOption(r.pillSelect, '0', '不使用丹药');
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
    Ui.addOption(r.pillSelect, '0', '不使用丹药');
    const maximum = info.pill
      ? Math.min(2, info.pill.maxSelectable || 0)
      : 0;
    for (let count = 1; count <= maximum; count++) {
      Ui.addOption(
        r.pillSelect,
        String(count),
        (info.pill.name || '未知丹药') + ' ×' + count
      );
    }
    r.pillSelect.value = String(quantity);
    r.pillSelect.disabled = maximum === 0;
    r.baseEl.textContent = '基础概率：' + Ui.percentText(info.baseChance);
    r.pillEl.textContent = '所选丹药加成：' + Ui.percentText(
      info.pill ? info.pill.bonus : 0
    );
    r.eventEl.textContent = '事件增益：' + Ui.percentText(info.eventBonus);
    r.finalEl.textContent = '最终概率：' + Ui.percentText(info.finalChance);
    r.failureEl.textContent =
      '失败：修为清空；门槛保留；本次丹药消耗';
    m.breakReady = !!info.ready;
    r.btn.disabled = !info.ready;
    r.btn.classList.toggle('disabled', !info.ready);
  }

  function buildOffline(m) {
    const a = Ui.api();
    const modal = Ui.el('div', 'modal', m.root);
    Ui.el('div', 'modal-title', modal, '离线收益');
    const body = Ui.el('div', 'modal-body', modal);
    const dur = Ui.el('div', 'off-dur', body, '');
    const listBox = Ui.el('div', 'off-list', body);
    const btn = Ui.el('button', 'big-btn', body, '领取');
    btn.addEventListener('click', () => {
      if (a.queries.persistence().locked) return;
      const reports = a.queries.offline().reports;
      Ui.invokeCommand('acknowledgeOffline', {
        reportIds: reports.map(report => report.id)
      });
    });
    m.refs = { dur, listBox, btn };
  }
  function updateOffline(m) {
    const a = Ui.api(); const r = m.refs;
    const offline = a.queries.offline();
    r.dur.textContent = '你离开了 ' +
      Ui.fmtDur(offline.summary.durationSeconds);
    r.listBox.innerHTML = '';
    const actions = offline.summary.actions || [];
    const combat = offline.summary.combat || {};
    const hasCombat = finitePositive(combat.ticks) ||
      hasMapCounts(combat.enemiesDefeated) ||
      hasMapCounts(combat.dungeonClears) ||
      hasMapCounts(combat.loot);
    if (actions.length === 0 && !hasCombat) {
      // 无产出不应弹窗；此处仅作防御，避免空壳「（无产出）」。
      Ui.el('div', 'off-empty', r.listBox, '结算完成');
    } else {
      for (const action of actions) {
        Ui.el('div', 'off-item', r.listBox,
          action.label + ' ×' + action.completed);
      }
      if (typeof Ui.renderCombatTelemetry === 'function') {
        Ui.renderCombatTelemetry(r.listBox, offline.summary);
      }
    }
  }

  function finitePositive(value) {
    return Number.isFinite(value) && value > 0;
  }

  function hasMapCounts(map) {
    if (!map || typeof map !== 'object') return false;
    return Object.keys(map).some(function (key) {
      return Number.isFinite(map[key]) && map[key] > 0;
    });
  }

  function settlingOfflineMessage() {
    const a = Ui.api();
    const progress = a && a.queries.settlingOffline
      ? a.queries.settlingOffline()
      : null;
    if (progress && progress.label) return progress.label;
    return '正在结算离线收益，请稍候…';
  }

  function buildSettlingOffline(m) {
    const modal = Ui.el('div', 'modal', m.root);
    Ui.el('div', 'modal-title', modal, '离线结算');
    const body = Ui.el('div', 'modal-body', modal);
    const msg = Ui.el(
      'div',
      'off-dur',
      body,
      settlingOfflineMessage()
    );
    m.refs = { msg };
  }
  function updateSettlingOffline(m) {
    if (m.refs && m.refs.msg) {
      m.refs.msg.textContent = settlingOfflineMessage();
    }
  }

  function buildLunhui(m) {
    const a = Ui.api();
    const modal = Ui.el('div', 'modal', m.root);
    Ui.el('div', 'modal-title', modal, '寿元已尽');
    const body = Ui.el('div', 'modal-body', modal);
    Ui.el('div', 'lh-text', body, '未及突破，道消身陨，入轮回重修');
    Ui.el('div', 'lh-sub', body, '（形象保留，修为/境界/资源重置至练气一层）');
    const btn = Ui.el('button', 'big-btn', body, '入轮回');
    btn.addEventListener('click', () => {
      if (!a.queries.persistence().locked) {
        Ui.invokeCommand('enterLegacyRebirth');
      }
    });
    m.refs = { btn };
  }
  function updateLunhui() { /* 静态内容 */ }

  function buildLifespanBuffer(m) {
    const a = Ui.api();
    const modal = Ui.el('div', 'modal', m.root);
    Ui.el('div', 'modal-title', modal, '寿元将尽');
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', () => Ui.invokeCommand('closeLifespanBuffer'));
    const body = Ui.el('div', 'modal-body', modal);
    const text = Ui.el('div', 'lh-text', body, '');
    const sub = Ui.el('div', 'lh-sub', body, '');
    Ui.el('div', 'buffer-warning', body,
      '进入安全缓冲后，当前进行的动作已停止，社交与宗门类行动已锁定。');
    const actions = Ui.el('div', 'legacy-actions', body);
    const go = Ui.el('button', 'big-btn', actions, '开始人生转换');
    go.addEventListener('click', function () {
      Ui.invokeCommand('closeLifespanBuffer');
      if (!a.queries.persistence().locked) {
        Ui.invokeCommand('beginLegacyTransition', { cause: 'voluntary' });
      }
    });
    const later = Ui.el('button', 'small-btn legacy-cancel', actions, '稍后处理');
    later.addEventListener('click', () => Ui.invokeCommand('closeLifespanBuffer'));
    m.refs = { text: text, sub: sub };
  }
  function updateLifespanBuffer(m) {
    const a = Ui.api();
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
    const modal = Ui.el('div', 'modal legacy-modal', m.root);
    m.refs = {
      title: Ui.el('div', 'modal-title', modal, '人生转换'),
      body: Ui.el('div', 'modal-body legacy-transition-body', modal)
    };
    m.signature = null;
  }

  function updateLegacyTransition(m) {
    const a = Ui.api();
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
    Ui.el(
      'div',
      'legacy-preview',
      body,
      '十二项生活技能等级与经验保留；修为与本世临时状态重置'
    );
    if (pending.cause === 'lifespan') {
      Ui.el(
        'div',
        'buffer-warning',
        body,
        '寿元流程已经开始，必须选择一条人生路线，无法取消。'
      );
    }

    const routes = Ui.el('div', 'legacy-routes', body);
    const eligible = {};
    (view.eligibleHeirIds || []).forEach(function (npcId) {
      eligible[npcId] = true;
    });
    const heirs = descendants.filter(function (person) {
      return eligible[person.npcId];
    });
    // 无继承人时若尚未选定路线，立刻落到「创建新身份」，避免卡在空选择态
    if (!heirs.length && !pending.route) {
      Ui.invokeCommand('chooseLegacyRoute', { route: 'newIdentity' });
      return;
    }
    if (heirs.length) {
      Ui.el('div', 'legacy-route-title', routes, '由成年后代接续');
      heirs.forEach(function (person) {
        const button = Ui.el(
          'button',
          'legacy-route' +
            (pending.route === 'descendant' &&
             pending.heirNpcId === person.npcId ? ' active' : ''),
          routes,
          person.name + ' · ' + person.ageYears + ' 岁 · 可继承'
        );
        button.addEventListener('click', function () {
          Ui.invokeCommand('chooseLegacyRoute', {
            route: 'descendant',
            heirNpcId: person.npcId
          });
        });
      });
    } else {
      Ui.el(
        'div',
        'muted',
        routes,
        '当前没有可继承的成年后代，将以创建新身份继续本脉轮回。'
      );
    }
    if (heirs.length) {
      const newIdentity = Ui.el(
        'button',
        'legacy-route' +
          (pending.route === 'newIdentity' ? ' active' : ''),
        routes,
        '创建新身份'
      );
      newIdentity.addEventListener('click', function () {
        Ui.invokeCommand('chooseLegacyRoute', { route: 'newIdentity' });
      });
    }

    let nameInput = null;
    let originSelect = null;
    if (pending.route === 'newIdentity') {
      const draftCard = Ui.el('div', 'legacy-preview legacy-draft', body);
      Ui.el('div', 'card-title', draftCard, '新身份');
      Ui.el(
        'div',
        'muted',
        draftCard,
        '可改名并选择出身；生活技能会保留，修为与本世关系重置。'
      );
      nameInput = Ui.el('input', 'legacy-name-input', draftCard);
      nameInput.type = 'text';
      nameInput.maxLength = 12;
      nameInput.placeholder = '输入新名字';
      nameInput.value = pending.draft && pending.draft.name || '';
      originSelect = Ui.el('select', 'legacy-origin-select', draftCard);
      (view.origins || []).forEach(function (row) {
        Ui.addOption(originSelect, row.id, row.name);
      });
      originSelect.value = pending.draft && pending.draft.originId ||
        'wanderingReborn';
    }

    const actions = Ui.el('div', 'legacy-actions', body);
    const confirm = Ui.el(
      'button',
      'big-btn legacy-confirm',
      actions,
      '确认进入下一段人生'
    );
    const draftName = nameInput
      ? String(nameInput.value || '').trim()
      : (pending.draft && pending.draft.name) || '';
    confirm.disabled = !pending.route ||
      (pending.route === 'newIdentity' && !draftName);
    confirm.classList.toggle('disabled', confirm.disabled);
    if (nameInput) {
      nameInput.addEventListener('input', function () {
        const ready = !!String(nameInput.value || '').trim();
        confirm.disabled = !ready;
        confirm.classList.toggle('disabled', !ready);
      });
    }
    confirm.addEventListener('click', function () {
      if (pending.route === 'newIdentity') {
        const name = nameInput
          ? String(nameInput.value || '').trim()
          : '';
        if (!name) {
          Ui.showToast('请先填写新身份名字');
          return;
        }
        const draftResult = Ui.invokeCommand('updateNewIdentityDraft', {
          name: name,
          originId: originSelect
            ? originSelect.value
            : (pending.draft && pending.draft.originId) || 'wanderingReborn',
          personalityId: pending.draft && pending.draft.personalityId,
          talentId: pending.draft && pending.draft.talentId,
          appearance: pending.draft && pending.draft.appearance
        });
        if (!draftResult || !draftResult.ok) return;
      }
      Ui.invokeCommand('confirmLegacyTransition');
    });
    if (pending.cause === 'voluntary') {
      const cancel = Ui.el(
        'button',
        'small-btn legacy-cancel',
        actions,
        '取消'
      );
      cancel.addEventListener('click', function () {
        Ui.invokeCommand('cancelLegacyTransition');
      });
    }
  }

  function syncModals() {
    const a = Ui.api();
    const modalsView = a.queries.app().modals;
    const legacy = a.queries.legacyTransition
      ? a.queries.legacyTransition()
      : null;
    const legacyPending = !!(legacy && legacy.pending);
    const modalSignature = [
      modalsView.break ? 1 : 0,
      modalsView.offline ? 1 : 0,
      modalsView.settlingOffline ? 1 : 0,
      modalsView.legacyRebirth ? 1 : 0,
      modalsView.lifespanBuffer ? 1 : 0,
      legacyPending ? 1 : 0
    ].join('|');
    const modalFlagsChanged = modalSignature !== Ui.shellHud.modalSignature;
    if (modalFlagsChanged) Ui.shellHud.modalSignature = modalSignature;

    // 关闭态跳过重复 display=none；仅打开时每帧 update（突破概率等会变）。
    if (modalFlagsChanged || modalsView.break) {
      toggleModal('break', modalsView.break, buildBreak, updateBreak);
    }
    if (modalFlagsChanged || modalsView.settlingOffline) {
      toggleModal(
        'settlingOffline',
        !!modalsView.settlingOffline,
        buildSettlingOffline,
        updateSettlingOffline
      );
    }
    if (modalFlagsChanged || modalsView.offline) {
      toggleModal('offline', modalsView.offline, buildOffline, updateOffline);
    }
    if (modalFlagsChanged || modalsView.legacyRebirth) {
      toggleModal(
        'lunhui',
        modalsView.legacyRebirth,
        buildLunhui,
        updateLunhui
      );
    }
    if (modalFlagsChanged || modalsView.lifespanBuffer) {
      toggleModal(
        'lifespanBuffer',
        modalsView.lifespanBuffer,
        buildLifespanBuffer,
        updateLifespanBuffer
      );
    }

    const legacyOpen = !!(Ui.modals.legacy && Ui.modals.legacy.root &&
      Ui.modals.legacy.root.style.display === 'flex');
    Ui.shellHud.legacyPending = legacyPending;
    if (legacyPending || legacyOpen || modalFlagsChanged) {
      toggleModal(
        'legacy',
        legacyPending,
        buildLegacyTransition,
        updateLegacyTransition
      );
    }
    Ui.syncFarmPlotModal();
  }

  // ============================================================
  // 主游戏渲染入口（每帧由 game.js 调用）
  // ============================================================
  function renderGame() {
    const a = Ui.api(); if (!a) return;
    const app = a.queries.app();
    if (app.phase !== 'game') {
      if (Ui.shell.built) Ui.hideShell();
      if (app.phase === 'create' || app.phase === 'edit') {
        Ui.showCreator(app.phase === 'create');
      }
      Ui.updatePersistenceStatus();
      return;
    }

    // 进游戏后再补齐导航页模块（洞府/技能/社交/战斗），避免首屏同步解析。
    if (!Ui.__pagesReady) {
      const pagesPresent = !!(Ui.getPage && Ui.getPage('home') && Ui.getPage('combat'));
      if (pagesPresent) {
        Ui.__pagesReady = true;
      } else if (!Ui.__pagesLoading) {
        Ui.__pagesLoading = true;
        const ready = (typeof LazyContent !== 'undefined' &&
          LazyContent && typeof LazyContent.ensureUiPages === 'function')
          ? LazyContent.ensureUiPages()
          : Promise.resolve();
        ready.then(function () {
          Ui.__pagesReady = true;
          Ui.__pagesLoading = false;
        }, function (error) {
          Ui.__pagesLoading = false;
          console.warn('[ui] page modules failed to load', error);
        });
      }
      if (!Ui.__pagesReady) {
        // 离线结算 / 持久化锁期间仍要画出壳与弹窗，否则长追算会白屏。
        const modals = app.modals || {};
        const persistence = a.queries.persistence
          ? a.queries.persistence()
          : null;
        const needShell = !!(
          modals.settlingOffline ||
          modals.offline ||
          (persistence && persistence.locked)
        );
        if (needShell) {
          ensureGameStylesLazy();
          if (!Ui.shell.built) Ui.buildShell();
          Ui.showShell();
          Ui.hideCreator();
          if (typeof Ui.updateTopbar === 'function') Ui.updateTopbar();
          if (typeof Ui.updateActionBar === 'function') Ui.updateActionBar();
          syncModals();
        }
        Ui.updatePersistenceStatus();
        return;
      }
    }

    ensureGameStylesLazy();

    if (!Ui.shell.built) Ui.buildShell();
    Ui.showShell();
    Ui.hideCreator();
    Ui.refreshAvatar();
    Ui.updateTopbar();
    Ui.updateActionBar();
    Ui.updateNavActive();
    Ui.updateContent();
    syncModals();
    Ui.updatePersistenceStatus();
  }

  function ensureGameStylesLazy() {
    if (Ui.__gameStylesReady) return;
    if (typeof LazyContent !== 'undefined' &&
        LazyContent && typeof LazyContent.ensureGameStyles === 'function') {
      if (!Ui.__gameStylesLoading) {
        Ui.__gameStylesLoading = true;
        LazyContent.ensureGameStyles().then(function () {
          Ui.__gameStylesReady = true;
          Ui.__gameStylesLoading = false;
        }, function () {
          Ui.__gameStylesLoading = false;
        });
      }
    } else {
      Ui.__gameStylesReady = true;
    }
  }

  // ============================================================
  // 角色创建 / 编辑页（试点，已落地）
  // ============================================================
  function build() {
    if (Ui.created) return;
    const a = Ui.api(); if (!a) { console.warn('[ui] GameAPI 未就绪'); return; }
    Ui.card = document.createElement('div');
    Ui.card.className = 'creator-card';
    Ui.titleEl = document.createElement('h2'); Ui.titleEl.className = 'creator-title';
    Ui.card.appendChild(Ui.titleEl);
    const pw = document.createElement('div'); pw.className = 'preview-wrap';
    Ui.previewCanvas = document.createElement('canvas'); Ui.previewCanvas.className = 'preview';
    pw.appendChild(Ui.previewCanvas); Ui.card.appendChild(pw);
    const rnd = document.createElement('button'); rnd.className = 'btn btn-random';
    rnd.textContent = '随机生成';
    rnd.addEventListener('click', () => {
      a.commands.randomizeAppearance();
      Ui.refresh();
    });
    Ui.creatorProgressControls.push(rnd);
    Ui.card.appendChild(rnd);
    const selBox = document.createElement('div'); selBox.className = 'sel-box';
    for (const c of Ui.CATS) {
      const row = document.createElement('div'); row.className = 'sel-row';
      const label = document.createElement('div'); label.className = 'sel-label'; label.textContent = Ui.CAT_LABEL[c];
      const left = document.createElement('button'); left.className = 'sel-arrow'; left.textContent = '‹';
      left.addEventListener('click', () => {
        a.commands.stepAppearance({ part: c, delta: -1 });
        Ui.refresh();
      });
      Ui.creatorProgressControls.push(left);
      const idx = document.createElement('div'); idx.className = 'sel-index'; idx.textContent = '1';
      const right = document.createElement('button'); right.className = 'sel-arrow'; right.textContent = '›';
      right.addEventListener('click', () => {
        a.commands.stepAppearance({ part: c, delta: 1 });
        Ui.refresh();
      });
      Ui.creatorProgressControls.push(right);
      row.appendChild(label); row.appendChild(left); row.appendChild(idx); row.appendChild(right);
      selBox.appendChild(row); Ui.selIndexEls[c] = idx;
    }
    Ui.card.appendChild(selBox);
    Ui.confirmBtn = document.createElement('button'); Ui.confirmBtn.className = 'btn btn-confirm';
    Ui.confirmBtn.addEventListener('click', Ui.onConfirm);
    Ui.creatorProgressControls.push(Ui.confirmBtn);
    Ui.card.appendChild(Ui.confirmBtn);
    Ui.root.appendChild(Ui.card);
    Ui.previewCtx = Ui.previewCanvas.getContext('2d');
    Ui.created = true;
  }
  function onConfirm() {
    const a = Ui.api();
    const saved = Ui.isCreateMode
      ? a.commands.confirmCreate()
      : a.commands.saveAppearance();
    Ui.updatePersistenceStatus();
    if (saved.ok) Ui.hideCreator();
  }
  function refresh() {
    const a = Ui.api(); if (!a) return;
    Ui.updatePersistenceStatus();
    const indices = a.queries.app().appearance.indices;
    for (const c of Ui.CATS) {
      if (Ui.selIndexEls[c]) {
        Ui.selIndexEls[c].textContent = String((indices[c] || 0) + 1);
      }
    }
    Ui.refreshPreview();
  }
  function refreshPreview() {
    const a = Ui.api(); if (!Ui.previewCanvas || !a) return;
    a.render.drawCharacter(Ui.previewCanvas);
  }
  function showCreator(isCreate) {
    Ui.isCreateMode = !!isCreate; build();
    if (!Ui.created) return;
    Ui.hideShell();
    Ui.titleEl.textContent = isCreate ? '创建角色' : '编辑形象';
    Ui.confirmBtn.textContent = isCreate ? '确认创建 · 开始修行' : '保存并返回';
    Ui.card.style.display = 'flex'; refresh();
  }
  function hideCreator() { if (Ui.card) Ui.card.style.display = 'none'; }

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
    if (!Ui.toastStack) return;
    const text = String(msg == null ? '' : msg).trim();
    if (!text) return;
    const now = Date.now();
    // 同步双通道（game.toast + UI.invokeCommand）会连弹同一句，短窗去重
    if (text === Ui.lastToastText && (now - Ui.lastToastAt) < Ui.TOAST_DEDUPE_MS) {
      return;
    }
    Ui.lastToastText = text;
    Ui.lastToastAt = now;
    while (Ui.toastStack.children && Ui.toastStack.children.length >= 3) {
      removeToastNode(Ui.toastStack.children[0]);
    }
    const item = Ui.el('div', 'toast show', Ui.toastStack, text);
    setTimeout(function () {
      if (item.classList) item.classList.remove('show');
      removeToastNode(item);
    }, 1800);
  }

  function formatGainTipText(entry, amount) {
    const type = entry && entry.type ? String(entry.type) : 'item';
    const label = entry && entry.label != null
      ? String(entry.label)
      : '';
    const n = Number.isFinite(amount) ? amount : 0;
    if (type === 'kill') {
      return '击败 ' + (label || '敌人') + ' ×' + n;
    }
    if (type === 'skillXp' || type === 'techniqueXp') {
      return (label || '经验') + ' +' + n + ' 经验';
    }
    if (type === 'masteryXp') {
      return (label || '专精') + ' +' + n;
    }
    if (type === 'cultivation') {
      return '修为 +' + n;
    }
    return (label || '物品') + ' +' + n;
  }

  function gainTipToneClass(type, quality) {
    if (type === 'kill') return 'tone-kill';
    if (type === 'skillXp' ||
        type === 'masteryXp' ||
        type === 'techniqueXp' ||
        type === 'cultivation') {
      return 'tone-xp';
    }
    const q = Ui.uiQuality(quality || 'white');
    return q ? 'q-' + q : 'tone-item';
  }

  function updateGainTipNode(record) {
    if (!record || !record.node || !record.textEl) return;
    record.textEl.textContent = formatGainTipText(record, record.amount);
  }

  function clearGainTipRecord(key) {
    const record = Ui.gainTipEntries[key];
    if (!record) return;
    if (record.timer != null && typeof clearTimeout === 'function') {
      clearTimeout(record.timer);
    }
    if (record.outTimer != null && typeof clearTimeout === 'function') {
      clearTimeout(record.outTimer);
    }
    delete Ui.gainTipEntries[key];
    removeToastNode(record.node);
  }

  function scheduleGainTipRemoval(key, extraDelay) {
    const record = Ui.gainTipEntries[key];
    if (!record || !record.node) return;
    if (record.timer != null && typeof clearTimeout === 'function') {
      clearTimeout(record.timer);
    }
    if (record.outTimer != null && typeof clearTimeout === 'function') {
      clearTimeout(record.outTimer);
      record.outTimer = null;
    }
    if (record.node.classList) {
      record.node.classList.remove('is-out');
      record.node.classList.add('is-hold');
    }
    const delay = Ui.GAIN_TIP_LIFE_MS +
      Math.max(0, Number(extraDelay) || 0);
    record.timer = setTimeout(function () {
      const current = Ui.gainTipEntries[key];
      if (!current || !current.node) return;
      if (current.node.classList) {
        current.node.classList.remove('is-hold');
        current.node.classList.add('is-out');
      }
      current.outTimer = setTimeout(function () {
        clearGainTipRecord(key);
      }, Ui.GAIN_TIP_OUT_MS);
    }, delay);
  }

  function enforceGainTipCap() {
    if (!Ui.gainTipStack || !Ui.gainTipStack.children) return;
    while (Ui.gainTipStack.children.length > Ui.GAIN_TIP_MAX) {
      const oldest = Ui.gainTipStack.children[0];
      const key = oldest && oldest.dataset
        ? oldest.dataset.gainKey
        : null;
      if (key && Ui.gainTipEntries[key]) {
        clearGainTipRecord(key);
      } else {
        removeToastNode(oldest);
      }
    }
  }

  function pushGainTip(entry) {
    if (!Ui.gainTipStack || !entry || typeof entry !== 'object') return;
    const key = entry.key != null ? String(entry.key).trim() : '';
    if (!key) return;
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount) || amount === 0) return;
    const now = Date.now();
    const existing = Ui.gainTipEntries[key];
    // 同 key 仍在屏上时只累加，不拆掉重建（避免动画重播）
    if (existing && existing.node) {
      existing.amount += amount;
      if (entry.label != null) existing.label = String(entry.label);
      if (entry.type != null) existing.type = String(entry.type);
      existing.mergeUntil = now + Ui.GAIN_TIP_MERGE_MS;
      updateGainTipNode(existing);
      scheduleGainTipRemoval(key, 0);
      return;
    }
    if (existing) clearGainTipRecord(key);

    const type = entry.type != null ? String(entry.type) : 'item';
    const label = entry.label != null ? String(entry.label) : '';
    const itemId = entry.itemId != null ? String(entry.itemId) : '';
    let quality = entry.quality || 'white';
    let itemData = null;
    if (type === 'item' && itemId) {
      itemData = Ui.resolveItemTipData({ itemId: itemId });
      quality = itemData.quality || quality;
    }

    const stagger = (Ui.gainTipStaggerSlot % Ui.GAIN_TIP_MAX) *
      Ui.GAIN_TIP_STAGGER_MS;
    Ui.gainTipStaggerSlot += 1;

    const node = Ui.el(
      'div',
      'gain-tip ' + gainTipToneClass(type, quality),
      Ui.gainTipStack
    );
    node.dataset.gainKey = key;
    if (node.style) {
      node.style.animationDelay = stagger + 'ms';
    }
    if (typeof node.addEventListener === 'function') {
      node.addEventListener('animationend', function onGainTipIn(event) {
        if (event && event.animationName &&
            event.animationName !== 'gain-tip-in') {
          return;
        }
        if (node.classList) node.classList.add('is-hold');
        node.removeEventListener('animationend', onGainTipIn);
      });
    } else if (node.classList) {
      node.classList.add('is-hold');
    }
    if (type === 'item') {
      const icon = Ui.el('div', 'gain-tip-icon', node);
      if (itemData) {
        Ui.renderItemIcon(icon, itemData, { fallback: itemData.icon || '📦' });
      } else {
        icon.textContent = '📦';
      }
    } else {
      Ui.el(
        'div',
        'gain-tip-icon gain-tip-icon-symbol',
        node,
        type === 'kill' ? '⚔' : type === 'cultivation' ? '✦' : '↑'
      );
    }
    const body = Ui.el('div', 'gain-tip-body', node);
    const textEl = Ui.el('div', 'gain-tip-text', body);

    const record = {
      key: key,
      type: type,
      label: label,
      amount: amount,
      node: node,
      textEl: textEl,
      mergeUntil: now + Ui.GAIN_TIP_MERGE_MS,
      timer: null,
      outTimer: null
    };
    Ui.gainTipEntries[key] = record;
    updateGainTipNode(record);
    enforceGainTipCap();
    scheduleGainTipRemoval(key, stagger);
  }

  function pushGainTips(entries) {
    if (!Array.isArray(entries)) return;
    for (let i = 0; i < entries.length; i += 1) {
      pushGainTip(entries[i]);
    }
  }

  function init() {
    Ui.root = document.getElementById('ui');
    if (!Ui.root) console.warn('[ui] 找不到 #ui 容器');
    Ui.buildShell();
  }

  // 对外接口
  window.UI = {
    init,
    showCreator,
    hideCreator,
    refresh,
    refreshPreview,
    renderGame,
    showToast,
    pushGainTip,
    pushGainTips,
    hideShell: Ui.hideShell,
    showShell: Ui.showShell
  };
  init();

  Ui.toggleModal = toggleModal;
  Ui.buildBreak = buildBreak;
  Ui.updateBreak = updateBreak;
  Ui.buildOffline = buildOffline;
  Ui.updateOffline = updateOffline;
  Ui.buildLunhui = buildLunhui;
  Ui.updateLunhui = updateLunhui;
  Ui.buildLifespanBuffer = buildLifespanBuffer;
  Ui.updateLifespanBuffer = updateLifespanBuffer;
  Ui.buildLegacyTransition = buildLegacyTransition;
  Ui.updateLegacyTransition = updateLegacyTransition;
  Ui.syncModals = syncModals;
  Ui.renderGame = renderGame;
  Ui.build = build;
  Ui.onConfirm = onConfirm;
  Ui.refresh = refresh;
  Ui.refreshPreview = refreshPreview;
  Ui.showCreator = showCreator;
  Ui.hideCreator = hideCreator;
  Ui.removeToastNode = removeToastNode;
  Ui.showToast = showToast;
  Ui.formatGainTipText = formatGainTipText;
  Ui.gainTipToneClass = gainTipToneClass;
  Ui.updateGainTipNode = updateGainTipNode;
  Ui.clearGainTipRecord = clearGainTipRecord;
  Ui.scheduleGainTipRemoval = scheduleGainTipRemoval;
  Ui.enforceGainTipCap = enforceGainTipCap;
  Ui.pushGainTip = pushGainTip;
  Ui.pushGainTips = pushGainTips;
  Ui.init = init;
})();
