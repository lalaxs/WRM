// ============================================================
// ui-social.js — XiuxianUi page module (classic script, no bundler)
// ============================================================
(function () {
  var Ui = window.XiuxianUi = window.XiuxianUi || {};
    'use strict';

  function buildRelationship(c) {
    const refs = Ui.contentState.refs;
    if (!Ui.api().queries.relationships) {
      Ui.buildReserve(
        c,
        'reserve-stage4',
        '关系',
        '完整关系系统将在人物与事件阶段开放'
      );
      return;
    }
    const charm = Ui.api().queries.charm();
    refs.skillId = 'charm';
    Ui.buildSkillHead(c, {
      skillId: 'charm',
      title: '魅力',
      level: charm.level,
      xp: charm.xp,
      nextXp: charm.nextXp,
      description:
        '正向关系 ×' +
        charm.benefits.positiveRelationMultiplier.toFixed(2) +
        ' · 误会降低 ' +
        Ui.percentText(charm.benefits.misunderstandingReduction)
    }, 'relationship-page');
    c.classList.add('relationship-page');

    const tools = Ui.el('div', 'relationship-tools', c);
    refs.relationshipSearch = Ui.el('input', 'relationship-search', tools);
    refs.relationshipSearch.type = 'search';
    refs.relationshipSearch.placeholder = '搜索姓名、地区或宗门';
    refs.relationshipSearch.value = Ui.relationshipUiState.search;
    refs.relationshipSearch.addEventListener('input', function (event) {
      Ui.relationshipUiState.search = event.target.value;
      refs.relationshipListSignature = null;
      refs.relationshipListCache = null;
      Ui.renderRelationshipWorld();
    });
    refs.relationshipSort = Ui.el('select', 'relationship-sort', tools);
    [
      ['recent', '最近来往'],
      ['affection', '好感'],
      ['trust', '信任'],
      ['name', '姓名']
    ].forEach(function (entry) {
      Ui.addOption(refs.relationshipSort, entry[0], entry[1]);
    });
    refs.relationshipSort.value = Ui.relationshipUiState.sort;
    refs.relationshipSort.addEventListener('change', function (event) {
      Ui.relationshipUiState.sort = event.target.value;
      refs.relationshipListSignature = null;
      refs.relationshipListCache = null;
      Ui.renderRelationshipWorld();
    });
    refs.relationshipHost = Ui.el('div', 'relationship-layout', c);
    refs.relationshipListHost = Ui.el(
      'div',
      'person-card-grid',
      refs.relationshipHost
    );
    Ui.liveRelationship(true);
  }

  function liveRelationship(force) {
    const refs = Ui.contentState.refs;
    if (!refs.skillTitle || refs.skillId !== 'charm') return;
    const now = Date.now();
    const personOpen = Ui.modals.personDetail &&
      Ui.modals.personDetail.root &&
      Ui.modals.personDetail.root.style.display !== 'none';
    // 列表 2s 节流；人物弹窗打开时加快到 0.5s，便于修为条跟手。
    const throttleMs = personOpen ? 500 : 2000;
    if (!force &&
        refs.relationshipLiveAt &&
        (now - refs.relationshipLiveAt) < throttleMs) {
      return;
    }
    refs.relationshipLiveAt = now;
    const charm = Ui.api().queries.charm();
    Ui.updateSkillHead({
      skillId: 'charm',
      title: '魅力',
      level: charm.level,
      xp: charm.xp,
      nextXp: charm.nextXp,
      description:
        '正向关系 ×' +
        charm.benefits.positiveRelationMultiplier.toFixed(2) +
        ' · 误会降低 ' +
        Ui.percentText(charm.benefits.misunderstandingReduction)
    });
    if (force) {
      refs.relationshipListCache = null;
      refs.relationshipListSignature = null;
    }
    Ui.renderRelationshipWorld();
    if (Ui.modals.personDetail &&
        Ui.modals.personDetail.root &&
        Ui.modals.personDetail.root.style.display !== 'none') {
      // 先尝试只刷新社交进度条 / 修为条，避免每秒整页重建人物弹窗。
      if (!force) {
        Ui.refreshPersonSocialProgress(Ui.modals.personDetail);
        Ui.refreshPersonBreakthroughProgress(Ui.modals.personDetail);
      }
      Ui.updatePersonDetailModal(false);
    }
    if (Ui.modals.socialDetail &&
        Ui.modals.socialDetail.root &&
        Ui.modals.socialDetail.root.style.display !== 'none') {
      Ui.updateSocialDetailModal(false);
    }
  }

  function refreshPersonSocialProgress(modal) {
    if (!modal || !modal.npcId || !modal.refs || !modal.refs.body) return;
    const bars = modal.refs.body.querySelectorAll(
      '.social-progress.named-progress'
    );
    if (!bars.length) return;
    const social = Ui.api().queries.social({ npcId: modal.npcId });
    if (!social || !Array.isArray(social.parallel)) return;
    social.parallel.forEach(function (progress, index) {
      const row = bars[index];
      if (!row) return;
      const fill = row.querySelector('.meter-fill');
      const text = row.querySelector('.meter-text');
      const pct = Ui.percent(progress.progress);
      if (fill) fill.style.width = pct + '%';
      if (text) {
        text.textContent = progress.ready
          ? '已抵达 · 即将见闻'
          : '还需 ' + Ui.fmtDur(progress.remainingSeconds);
      }
    });
  }

  function refreshPersonBreakthroughProgress(modal) {
    if (!modal || !modal.npcId || !modal.refs || !modal.refs.body) return;
    const block = modal.refs.body.querySelector('.person-breakthrough');
    if (!block) return;
    let detail = null;
    try {
      detail = Ui.api().queries.relationship({
        npcId: modal.npcId,
        includeHistory: false
      });
    } catch (error) {
      return;
    }
    const data = detail && detail.breakthrough;
    if (!data) return;
    const fill = block.querySelector('.meter-fill');
    const text = block.querySelector('.meter-text');
    const rateEl = block.querySelector('.person-break-efficiency');
    const meta = block.querySelector('.person-break-meta');
    if (fill) {
      fill.style.width =
        Math.max(0, Math.min(100, data.percent || 0)) + '%';
    }
    if (text) {
      text.textContent =
        Math.floor(data.cultivation || 0) +
        '/' +
        Math.floor(data.need || 0) +
        ' · ' +
        (data.percent || 0) +
        '%';
    }
    if (rateEl) {
      rateEl.textContent = formatCultivationEfficiency(data.efficiency);
    }
    if (meta && data.nextRealm) {
      meta.textContent =
        '突破 ' +
        (Number.isFinite(data.successRate) ? data.successRate : 0) +
        '%';
    }
  }


  // 八维关系各用一种爱心颜色（列表卡仍用爱心；弹窗胶囊用同色底）。


  function relationHeartClass(metricId) {
    return Ui.RELATION_HEART_CLASS[metricId] || 'heart-affection';
  }

  function relationTagClass(metricId) {
    return Ui.RELATION_TAG_CLASS[metricId] || 'rel-affection';
  }

  function appendRelationHeart(parent, metricId, extraClass) {
    return Ui.el(
      'span',
      'relation-heart ' + relationHeartClass(metricId) +
        (extraClass ? ' ' + extraClass : ''),
      parent,
      '♥'
    );
  }

  function metricPersonToPlayer(metrics, metricId) {
    if (!Array.isArray(metrics)) return 0;
    for (let index = 0; index < metrics.length; index++) {
      const metric = metrics[index];
      if (metric && metric.id === metricId) {
        return Ui.relationDisplayValue(metricId, metric.personToPlayer);
      }
    }
    return 0;
  }

  function topRelationFromMetrics(metrics) {
    let topId = 'affection';
    let topValue = 0;
    if (!Array.isArray(metrics)) {
      return { id: topId, value: topValue };
    }
    metrics.forEach(function (metric) {
      if (!metric || !metric.id) return;
      const amount = Ui.relationDisplayValue(metric.id, metric.personToPlayer);
      if (amount > topValue) {
        topValue = amount;
        topId = metric.id;
      }
    });
    return { id: topId, value: topValue };
  }


  function isPersonTipTrigger(target) {
    return !!(target && target.closest && (
      target.closest('[data-relation-tip-trigger="1"]') ||
      target.closest('[data-person-tip-trigger="1"]')
    ));
  }

  function ensureRelationTip() {
    if (Ui.relationTip.built) return Ui.relationTip;
    const host = Ui.root || document.body || null;
    const rootEl = Ui.el('div', 'item-tip relation-detail-tip', host);
    rootEl.style.display = 'none';
    const list = Ui.el('div', 'relation-detail-tip-list', rootEl);
    Ui.relationTip = {
      built: true,
      root: rootEl,
      list: list,
      open: false
    };
    document.addEventListener('click', function (event) {
      const target = event.target;
      if (Ui.relationTip.open) {
        if (!(Ui.relationTip.root && Ui.relationTip.root.contains &&
            Ui.relationTip.root.contains(target)) &&
            !isPersonTipTrigger(target)) {
          Ui.hideRelationTip();
        }
      }
      if (Ui.personTextTip.open) {
        if (!(Ui.personTextTip.root && Ui.personTextTip.root.contains &&
            Ui.personTextTip.root.contains(target)) &&
            !isPersonTipTrigger(target)) {
          Ui.hidePersonTextTip();
        }
      }
    });
    return Ui.relationTip;
  }

  function ensurePersonTextTip() {
    if (Ui.personTextTip.built) return Ui.personTextTip;
    ensureRelationTip();
    const host = Ui.root || document.body || null;
    const rootEl = Ui.el('div', 'item-tip person-text-tip', host);
    rootEl.style.display = 'none';
    const title = Ui.el('div', 'person-text-tip-title', rootEl);
    const body = Ui.el('div', 'person-text-tip-body', rootEl);
    Ui.personTextTip = {
      built: true,
      root: rootEl,
      title: title,
      body: body,
      open: false,
      key: ''
    };
    return Ui.personTextTip;
  }

  function hideRelationTip() {
    if (!Ui.relationTip.built || !Ui.relationTip.root) return;
    Ui.relationTip.root.style.display = 'none';
    Ui.relationTip.open = false;
    if (Ui.relationTip.list) Ui.relationTip.list.innerHTML = '';
  }

  function hidePersonTextTip() {
    if (!Ui.personTextTip.built || !Ui.personTextTip.root) return;
    Ui.personTextTip.root.style.display = 'none';
    Ui.personTextTip.open = false;
    Ui.personTextTip.key = '';
    if (Ui.personTextTip.title) Ui.personTextTip.title.textContent = '';
    if (Ui.personTextTip.body) Ui.personTextTip.body.textContent = '';
  }

  function showRelationTip(metrics, anchorElement) {
    hidePersonTextTip();
    const tip = ensureRelationTip();
    tip.list.innerHTML = '';
    const rows = Array.isArray(metrics) ? metrics : [];
    rows.forEach(function (metric) {
      if (!metric || !metric.id) return;
      const row = Ui.el('div', 'relation-detail-tip-row', tip.list);
      appendRelationHeart(row, metric.id, 'relation-detail-tip-heart');
      Ui.el(
        'span',
        'relation-detail-tip-label',
        row,
        Ui.RELATION_LABELS[metric.id] || metric.id
      );
      Ui.el(
        'span',
        'relation-detail-tip-value',
        row,
        String(Ui.relationDisplayValue(metric.id, metric.personToPlayer))
      );
    });
    if (!tip.list.childNodes.length) {
      Ui.el('div', 'relation-detail-tip-empty', tip.list, '暂无关系数据');
    }
    tip.root.style.display = 'block';
    tip.open = true;
    Ui.positionItemTip(tip.root, anchorElement);
  }

  function showPersonTextTip(key, titleText, bodyText, anchorElement) {
    hideRelationTip();
    const tip = ensurePersonTextTip();
    if (tip.open && tip.key === key) {
      hidePersonTextTip();
      return;
    }
    tip.key = key;
    tip.title.textContent = titleText || '';
    tip.body.textContent = bodyText || '暂无说明。';
    tip.root.style.display = 'block';
    tip.open = true;
    Ui.positionItemTip(tip.root, anchorElement);
  }




  function relationDisplayValue(metricId, value) {
    return Math.max(0, Math.min(100, Math.floor(Number(value) || 0)));
  }

  function relationTierText(metricId, value) {
    const tiers = Ui.RELATION_TIER_TEXTS[metricId];
    const amount = relationDisplayValue(metricId, value);
    if (!tiers || !tiers.length) return String(amount);
    for (let index = 0; index < tiers.length; index++) {
      if (amount <= tiers[index][0]) return tiers[index][1];
    }
    return tiers[tiers.length - 1][1];
  }

  function relationTagTone(metricId, value) {
    const amount = relationDisplayValue(metricId, value);
    const tones = [
      'tone-0', 'tone-1', 'tone-2', 'tone-3', 'tone-4', 'tone-5', 'tone-6'
    ];
    let tier = 0;
    if (amount <= 0) tier = 0;
    else if (amount <= 19) tier = 1;
    else if (amount <= 39) tier = 2;
    else if (amount <= 59) tier = 3;
    else if (amount <= 79) tier = 4;
    else if (amount <= 99) tier = 5;
    else tier = 6;
    return relationTagClass(metricId) + ' ' + tones[tier];
  }

  function fmtDurCompact(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    if (sec < 60) return sec + '秒';
    if (sec < 3600) {
      const minutes = Math.floor(sec / 60);
      const seconds = sec % 60;
      return seconds ? minutes + '分' + seconds + '秒' : minutes + '分';
    }
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return minutes ? hours + '小时' + minutes + '分' : hours + '小时';
  }

  function shortInteractionLabel(label) {
    const text = String(label || '');
    if (text.indexOf('一起修炼') >= 0) return '一起修炼';
    return text.length > 6 ? text.slice(0, 6) : text;
  }

  function romanceTendencyLabel(principle) {
    if (!principle) return '';
    const shortById = {
      exclusive: '专一',
      devoted: '从一而终',
      tolerant: '宽和',
      casual: '随性',
      open: '开放',
      negotiable: '可协商',
      monogamous: '专一',
      'absolute-monogamy': '绝对专一'
    };
    if (principle.id && shortById[principle.id]) {
      return '倾向：' + shortById[principle.id];
    }
    const name = String(principle.name || '').trim();
    if (!name) return '';
    if (name.indexOf('倾向') === 0) {
      return '倾向：' + name.replace(/^倾向/, '');
    }
    return '倾向：' + name;
  }


  function pickPresenceVignette(detail) {
    const pronoun = detail && detail.pronoun ? detail.pronoun : '对方';
    const personalityId = detail && detail.personality
      ? detail.personality.id
      : '';
    const list = Ui.PRESENCE_VIGNETTES[personalityId] ||
      Ui.PRESENCE_VIGNETTES._default;
    let hash = 0;
    const seed = String((detail && detail.npcId) || '') + personalityId;
    for (let index = 0; index < seed.length; index++) {
      hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }
    const template = list[hash % list.length] || list[0];
    return String(template).split('{pronoun}').join(pronoun);
  }

  function buildPersonPresenceText(detail, social) {
    const pronoun = detail && detail.pronoun ? detail.pronoun : '对方';
    const name = detail && detail.name ? detail.name : '对方';
    const where = detail && detail.region && detail.region.name
      ? detail.region.name
      : '别处';
    const status = detail && detail.activityStatus
      ? detail.activityStatus
      : 'normal';
    if (status === 'seclusion') {
      return name + '正在闭关修炼，外界难以打扰。';
    }
    if (status === 'injured') {
      return name + '身受重伤，正在疗养。';
    }
    if (status === 'imprisoned') {
      return name + '身陷囹圄，失去自由。';
    }
    if (status === 'missing') {
      return name + '下落不明，亲友焦急寻找。';
    }
    if (status === 'tribulation') {
      return name + '正在渡劫，天地异象环绕。';
    }
    if (status === 'exploring') {
      return name + '正在秘境或险地中探险，凶吉未卜。';
    }
    if (status === 'travel') {
      return name + '正在游历途中，行踪不定。';
    }
    if (status === 'dating') {
      if (detail.sameRegion) {
        return name + '与你有约，正在' + where + '等候。';
      }
      return name + '与你有约，正在' + where + '等候。';
    }
    if (!detail || !detail.sameRegion) {
      return name + '此刻在' + where + '活动，不在你周围。';
    }
    return pickPresenceVignette(detail) +
      pronoun + '就在附近。';
  }

  function renderPersonPresence(parent, detail, socialView) {
    const social = socialView || Ui.api().queries.social({ npcId: detail.npcId });
    const block = Ui.el('div', 'person-presence', parent);
    Ui.el('div', 'person-section-label', block, '状态');
    Ui.el(
      'div',
      'person-presence-text',
      block,
      buildPersonPresenceText(detail, social)
    );
    if (social && Array.isArray(social.parallel) && social.parallel.length) {
      social.parallel.forEach(function (progress) {
        const row = Ui.el('div', 'social-progress named-progress', block);
        Ui.el(
          'div',
          'social-progress-name',
          row,
          progress.label || '你正与对方相处。'
        );
        const bar = Ui.el('div', 'action-progress social-progress-bar', row);
        const fill = Ui.el('div', 'meter-fill', bar);
        const pct = Ui.percent(progress.progress);
        fill.style.width = pct + '%';
        Ui.el(
          'div',
          'meter-text',
          bar,
          progress.ready
            ? '已抵达 · 即将见闻'
            : '还需 ' + Ui.fmtDur(progress.remainingSeconds)
        );
      });
    }
  }

  function renderSocialPanel(parent, detail, socialView) {
    const social = socialView || Ui.api().queries.social({ npcId: detail.npcId });
    if (!social) return;
    const card = Ui.el('div', 'social-panel', parent);
    Ui.el('div', 'card-title', card, '互动');
    const locked = !!social.personBusy;
    const remote = social.sameRegion === false || detail.sameRegion === false;
    if (!social.interactions.length) {
      Ui.el(
        'div',
        'muted',
        card,
        detail.activityStatus && detail.activityStatus !== 'normal'
          ? '对方当前状态不便互动'
          : remote
            ? '对方不在同地，无法当面接近'
            : '此刻暂无可用互动'
      );
      return;
    }
    if (remote) {
      Ui.el('div', 'muted', card, '对方不在同地，仅可寄礼');
    }
    const buttons = Ui.el('div', 'social-action-buttons', card);
    social.interactions.forEach(function (action) {
      const button = Ui.el(
        'button',
        'social-action-btn' + (locked ? ' is-disabled' : ''),
        buttons
      );
      button.type = 'button';
      button.disabled = locked;
      Ui.el(
        'span',
        'social-action-btn-label',
        button,
        shortInteractionLabel(action.label)
      );
      Ui.el(
        'span',
        'social-action-btn-time',
        button,
        fmtDurCompact(action.durationSeconds)
      );
      if (!locked) {
        button.addEventListener('click', function () {
          Ui.openSocialDetailModal(detail.npcId, action.id);
        });
      }
    });
  }

  function personFactTipBody(kind, detail) {
    if (kind === 'tendency') {
      if (detail.romancePrinciple && detail.romancePrinciple.summary) {
        return detail.romancePrinciple.summary;
      }
      return '对方恋爱倾向尚不明朗。';
    }
    if (kind === 'personality') {
      if (detail.personality && detail.personality.summary) {
        return detail.personality.summary;
      }
      return '对方性格尚不明朗。';
    }
    if (kind === 'bond') {
      const stage = detail.bond && detail.bond.stage;
      if (stage && Ui.BOND_TIP_TEXTS[stage]) return Ui.BOND_TIP_TEXTS[stage];
      return '当前关系阶段尚不明朗。';
    }
    if (kind === 'preferences') {
      if (detail.preferences && detail.preferences.known) {
        return '对方偏爱：' + (detail.preferences.text || '未知') + '。';
      }
      return '好感未深时，对方喜好仍未透露。';
    }
    if (kind === 'spiritualRoot') {
      if (detail.spiritualRoot && detail.spiritualRoot.summary) {
        return detail.spiritualRoot.summary;
      }
      return '灵根尚不明朗。';
    }
    if (kind === 'parents') {
      return detail.parents && detail.parents.text &&
        detail.parents.text !== '不详'
        ? '已知双亲：' + detail.parents.text + '。'
        : '身世未明，父母信息不详。';
    }
    if (kind === 'friends') {
      return detail.friends && detail.friends.people &&
        detail.friends.people.length
        ? '已知友人：' + detail.friends.text + '。'
        : '暂无友人记载。';
    }
    if (kind === 'mentor') {
      return detail.mentor && detail.mentor.person
        ? '师尊：' + detail.mentor.text + '。'
        : '尚未拜入师门，或师尊不详。';
    }
    if (kind === 'daoCompanion') {
      return detail.daoCompanion && detail.daoCompanion.person
        ? '道侣：' + detail.daoCompanion.text + '。'
        : '暂无道侣。';
    }
    if (kind === 'efficiency') {
      const rate = detail.cultivationEfficiency ||
        (detail.breakthrough && detail.breakthrough.efficiency) ||
        0;
      return '每月增长修为约 ' +
        (Math.round(rate * 100) / 100) +
        ' 点；修为攒满后会立刻尝试突破。';
    }
    return '暂无说明。';
  }

  function renderPersonProfileFacts(parent, detail) {
    const facts = Ui.el('div', 'person-profile-facts', parent);
    function addFact(kind, label, value, tipTitle) {
      const row = Ui.el('div', 'person-profile-fact', facts);
      Ui.el('span', 'person-profile-fact-label', row, label);
      const link = Ui.el(
        'button',
        'person-profile-fact-value person-tip-link',
        row
      );
      link.type = 'button';
      link.setAttribute('data-person-tip-trigger', '1');
      link.textContent = value || '未知';
      link.addEventListener('click', function (event) {
        event.stopPropagation();
        showPersonTextTip(
          kind + ':' + ((detail && detail.npcId) || ''),
          tipTitle || label,
          personFactTipBody(kind, detail),
          link
        );
      });
    }
    function addKinFact(kind, label, bundle, tipTitle, emptyText) {
      const people = [];
      if (bundle && Array.isArray(bundle.people)) {
        bundle.people.forEach(function (person) {
          if (person) people.push(person);
        });
      } else if (bundle && bundle.person) {
        people.push(bundle.person);
      }
      const linkable = people.filter(function (person) {
        return person && person.npcId && !person.isPlayer;
      });
      if (!linkable.length) {
        addFact(
          kind,
          label,
          (bundle && bundle.text) || emptyText || '不详',
          tipTitle || label
        );
        return;
      }
      const row = Ui.el('div', 'person-profile-fact', facts);
      Ui.el('span', 'person-profile-fact-label', row, label);
      const valueHost = Ui.el(
        'span',
        'person-profile-fact-value person-profile-fact-links',
        row
      );
      linkable.forEach(function (person, index) {
        if (index > 0) {
          valueHost.appendChild(document.createTextNode('、'));
        }
        const link = Ui.el(
          'button',
          'event-npc-link person-kin-link',
          valueHost,
          person.name
        );
        link.type = 'button';
        link.title = '查看' + person.name;
        link.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          Ui.openPersonDetailModal(person.npcId);
        });
      });
    }
    addFact(
      'spiritualRoot',
      '灵根',
      detail.spiritualRoot && detail.spiritualRoot.name
        ? detail.spiritualRoot.name
        : '未知',
      '灵根'
    );
    addKinFact(
      'parents',
      '父母',
      detail.parents,
      '父母',
      '不详'
    );
    addKinFact(
      'mentor',
      '师尊',
      detail.mentor,
      '师尊',
      '不详'
    );
    addKinFact(
      'daoCompanion',
      '道侣',
      detail.daoCompanion,
      '道侣',
      '无'
    );
    const tendency = romanceTendencyLabel(detail.romancePrinciple)
      .replace(/^倾向[：:]/, '')
      .trim();
    addFact('tendency', '倾向', tendency || '未知', '恋爱倾向');
    addFact(
      'personality',
      '性格',
      detail.personality && detail.personality.name
        ? detail.personality.name
        : '未知',
      '性格'
    );
    addFact(
      'bond',
      '关系',
      (detail.bond && (Ui.BOND_LABELS[detail.bond.stage] || detail.bond.stage)) ||
        '陌生',
      '关系阶段'
    );
    addFact(
      'preferences',
      '喜好',
      detail.preferences && detail.preferences.text
        ? detail.preferences.text
        : '未知',
      '喜好'
    );
  }

  function renderPersonTraits(parent, detail) {
    const traits = detail && Array.isArray(detail.traits)
      ? detail.traits.filter(Boolean)
      : [];
    if (!traits.length) return;
    const list = Ui.el(
      'div',
      'person-meta-row person-portrait-tags person-trait-list',
      parent
    );
    traits.forEach(function (trait) {
      const pill = Ui.el('span', 'person-trait-pill', list);
      pill.textContent = typeof trait === 'string'
        ? trait
        : (trait.name || trait.id || '');
      if (trait && typeof trait === 'object' && trait.summary) {
        pill.title = trait.summary;
        pill.setAttribute('aria-label', trait.summary);
      }
    });
  }

  function renderPersonPortraitTags(parent, detail) {
    const tags = Ui.el('div', 'person-meta-row person-portrait-tags', parent);
    Ui.el(
      'span',
      'person-meta-pill',
      tags,
      detail.office && detail.office.affiliationLabel
        ? detail.office.affiliationLabel
        : (detail.sect ? detail.sect.name : '散修')
    );
    Ui.el(
      'span',
      'person-meta-pill',
      tags,
      detail.region && detail.region.name
        ? detail.region.name
        : '行踪不明'
    );
  }

  function formatCultivationEfficiency(value) {
    const rate = Math.max(0, Number(value) || 0);
    return (Math.round(rate * 100) / 100) + '/月';
  }

  function renderPersonBreakthrough(parent, breakthrough, realmName) {
    const data = breakthrough || {
      realm: realmName || '未知境界',
      cultivation: 0,
      need: 100,
      percent: 0,
      progress: 0,
      successRate: 100,
      efficiency: 0,
      nextRealm: null
    };
    const block = Ui.el('div', 'person-breakthrough', parent);
    const realm = data.realm || realmName || '未知境界';
    const efficiencyText = formatCultivationEfficiency(data.efficiency);
    const head = Ui.el('div', 'person-break-head', block);
    const title = Ui.el('div', 'person-break-title', head);
    if (!data.nextRealm) {
      Ui.el(
        'div',
        'person-section-label',
        title,
        realm + ' · 已至当前巅峰'
      );
      Ui.el('div', 'person-break-efficiency', title, efficiencyText);
      return;
    }
    Ui.el('div', 'person-section-label', title, realm);
    Ui.el('div', 'person-break-efficiency', title, efficiencyText);
    Ui.el(
      'div',
      'person-break-meta',
      head,
      '突破 ' + (Number.isFinite(data.successRate) ? data.successRate : 0) + '%'
    );
    const bar = Ui.el('div', 'action-progress person-break-bar', block);
    const fill = Ui.el('div', 'meter-fill', bar);
    fill.style.width = Math.max(0, Math.min(100, data.percent || 0)) + '%';
    Ui.el(
      'div',
      'meter-text',
      bar,
      Math.floor(data.cultivation || 0) +
        '/' +
        Math.floor(data.need || 0) +
        ' · ' +
        (data.percent || 0) +
        '%'
    );
  }

  function relationshipListSignature(list) {
    if (!list || !Array.isArray(list.people)) return 'empty';
    let out = String(list.total || 0) + '\0' +
      String(list.search || '') + '\0' +
      String(list.sort || '') + '\0' +
      String(list.calendarLabel || '');
    for (let index = 0; index < list.people.length; index++) {
      const person = list.people[index];
      out += '\n' + person.npcId + '\t' + person.name + '\t' +
        person.realm + '\t' +
        (person.affiliationLabel || person.sectName) + '\t' +
        person.topRelationId + '\t' + person.topRelationValue + '\t' +
        person.bondStage + '\t' + person.recentAt + '\t' +
        person.gender;
    }
    return out;
  }

  function relationshipDetailSignature(detail, social) {
    if (!detail) return 'none';
    const metrics = Array.isArray(detail.metrics)
      ? detail.metrics.map(function (metric) {
        return metric.id + ':' + metric.personToPlayer;
      }).join('|')
      : '';
    let socialPart = '';
    if (social) {
      const current = social.current
        ? social.current.interactionId
        : '';
      const parallel = Array.isArray(social.parallel)
        ? social.parallel.map(function (job) {
          return job.id + ':' + (job.ready ? 1 : 0);
        }).join(',')
        : '';
      const actions = Array.isArray(social.interactions)
        ? social.interactions.map(function (action) {
          return action.id;
        }).join(',')
        : '';
      const gifts = Array.isArray(social.gifts)
        ? social.gifts.map(function (gift) {
          return gift.itemId + 'x' + gift.quantity;
        }).join(',')
        : '';
      socialPart = [
        social.personBusy ? 1 : 0,
        current,
        parallel,
        actions,
        gifts
      ].join(';');
    }
    const history = Array.isArray(detail.history)
      ? detail.history.map(function (entry) {
        return entry.id + ':' + entry.body;
      }).join('|')
      : '';
    const breakthrough = detail.breakthrough
      ? (detail.breakthrough.cultivation || 0) + '/' +
        (detail.breakthrough.need || 0) + ':' +
        (detail.breakthrough.percent || 0) + ':' +
        (detail.breakthrough.nextRealm || '') + ':' +
        (detail.realm || '')
      : '';
    return [
      detail.npcId,
      detail.name,
      detail.realm,
      detail.bond && detail.bond.stage,
      detail.sect && detail.sect.id,
      detail.region && detail.region.id,
      detail.playerRegion && detail.playerRegion.id,
      detail.calendarLabel || '',
      detail.sameRegion ? 1 : 0,
      detail.personality && detail.personality.id,
      detail.preferences && detail.preferences.text,
      detail.activityStatus || 'normal',
      metrics,
      socialPart,
      history,
      breakthrough,
      Ui.relationshipUiState.modalTab
    ].join('\0');
  }

  function personPortraitSeed(person) {
    const appearance = person && person.appearance;
    if (appearance && typeof appearance === 'object') {
      return [
        person.npcId || person.name || '',
        appearance.buildId || '',
        appearance.faceId || '',
        appearance.hairId || '',
        appearance.featureId || ''
      ].join('|');
    }
    return String(person && (person.npcId || person.name) || '');
  }

  function paintPersonPortrait(canvas, person, options) {
    if (!canvas || !person) return false;
    const render = Ui.api().render;
    if (!render ||
        typeof render.randomNieParts !== 'function' ||
        typeof render.drawCharacterAppearance !== 'function') {
      return false;
    }
    const seed = personPortraitSeed(person);
    const key = seed + '\0' + String(person.gender || '');
    if (canvas.getAttribute('data-portrait-key') === key &&
        canvas.getAttribute('data-portrait-ok') === '1') {
      return true;
    }
    // 按捏脸特征种子绘制，保证列表/弹窗/事件点名同一形象。
    const appearance = render.randomNieParts(seed, person.gender);
    const painted = render.drawCharacterAppearance(
      canvas,
      appearance,
      options || null
    );
    canvas.setAttribute('data-portrait-key', key);
    // 贴图未齐或弹窗尚未完成布局时先显示局部，下一帧补绘。
    canvas.setAttribute(
      'data-portrait-ok',
      painted === true ? '1' : '0'
    );
    const retry = !(options && options.skipRetry);
    if (painted !== true && retry && typeof requestAnimationFrame === 'function') {
      const retries = Number(canvas.getAttribute('data-portrait-retry') || 0);
      if (retries < 8) {
        canvas.setAttribute('data-portrait-retry', String(retries + 1));
        requestAnimationFrame(function () {
          paintPersonPortrait(canvas, person, options);
        });
      }
    } else if (painted === true) {
      canvas.removeAttribute('data-portrait-retry');
    }
    return painted === true;
  }

  function personCardNameText(person) {
    const name = person && person.name ? person.name : '未知';
    const stage = person && person.bondStage;
    if (!stage || stage === 'stranger') return name;
    const label = Ui.BOND_LABELS[stage] || stage;
    return name + '（' + label + '）';
  }

  function updatePersonCardContent(card, person) {
    const nameNode = card.querySelector('.person-card-name');
    if (nameNode) nameNode.textContent = personCardNameText(person);
    const metaNode = card.querySelector('.person-card-meta');
    if (metaNode) metaNode.textContent = person.realm || '未知境界';
    const stats = card.querySelector('.person-card-stats');
    if (stats) {
      stats.innerHTML = '';
      appendRelationHeart(
        stats,
        person.topRelationId || 'affection',
        'person-card-heart'
      );
      Ui.el(
        'span',
        'person-card-heart-value',
        stats,
        String(Number(person.topRelationValue) || 0)
      );
    }
    const canvas = card.querySelector('.person-card-canvas');
    return canvas;
  }

  function createPersonCard(person) {
    const card = document.createElement('button');
    card.className = 'person-card';
    card.type = 'button';
    card.setAttribute('data-npc-id', person.npcId);
    const portrait = Ui.el('div', 'person-card-portrait', card);
    Ui.el('canvas', 'person-card-canvas', portrait);
    Ui.el('div', 'person-card-name', card, personCardNameText(person));
    Ui.el('div', 'person-card-meta', card, person.realm || '未知境界');
    const stats = Ui.el('div', 'person-card-stats', card);
    appendRelationHeart(
      stats,
      person.topRelationId || 'affection',
      'person-card-heart'
    );
    Ui.el(
      'span',
      'person-card-heart-value',
      stats,
      String(Number(person.topRelationValue) || 0)
    );
    card.addEventListener('click', function () {
      Ui.openPersonDetailModal(person.npcId);
    });
    return card;
  }

  function scheduleRelationshipPortraits(pending, generation) {
    const refs = Ui.contentState.refs;
    if (refs.relationshipPortraitTimer) {
      clearTimeout(refs.relationshipPortraitTimer);
      refs.relationshipPortraitTimer = null;
    }
    if (!pending.length) return;
    let cursor = 0;
    function paintBatch() {
      refs.relationshipPortraitTimer = null;
      if (refs.relationshipPortraitGen !== generation) return;
      const end = Math.min(cursor + 6, pending.length);
      for (; cursor < end; cursor++) {
        const entry = pending[cursor];
        if (entry.canvas &&
            entry.person &&
            entry.canvas.isConnected) {
          paintPersonPortrait(entry.canvas, entry.person);
        }
      }
      if (cursor < pending.length) {
        if (typeof requestAnimationFrame === 'function') {
          refs.relationshipPortraitTimer = requestAnimationFrame(paintBatch);
        } else {
          refs.relationshipPortraitTimer = setTimeout(paintBatch, 16);
        }
      }
    }
    if (typeof requestAnimationFrame === 'function') {
      refs.relationshipPortraitTimer = requestAnimationFrame(paintBatch);
    } else {
      refs.relationshipPortraitTimer = setTimeout(paintBatch, 0);
    }
  }

  function renderRelationshipList(listHost, list) {
    const refs = Ui.contentState.refs;
    if (refs.relationshipPortraitTimer) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(refs.relationshipPortraitTimer);
      }
      clearTimeout(refs.relationshipPortraitTimer);
      refs.relationshipPortraitTimer = null;
    }
    if (!list.people.length) {
      listHost.innerHTML = '';
      Ui.el('div', 'placeholder', listHost, '没有找到人物');
      return;
    }
    const existing = {};
    Array.prototype.forEach.call(
      listHost.querySelectorAll('.person-card[data-npc-id]'),
      function (card) {
        existing[card.getAttribute('data-npc-id')] = card;
      }
    );
    const pending = [];
    const generation = (refs.relationshipPortraitGen || 0) + 1;
    refs.relationshipPortraitGen = generation;
    const keep = {};
    list.people.forEach(function (person, index) {
      keep[person.npcId] = true;
      let card = existing[person.npcId];
      if (!card) {
        card = createPersonCard(person);
      } else {
        updatePersonCardContent(card, person);
      }
      if (card.parentNode !== listHost ||
          listHost.children[index] !== card) {
        if (index >= listHost.children.length) {
          listHost.appendChild(card);
        } else {
          listHost.insertBefore(card, listHost.children[index]);
        }
      }
      const canvas = card.querySelector('.person-card-canvas');
      if (!canvas) return;
      // First screenful paints sync; the rest yield to rAF so open stays snappy.
      if (index < 8) {
        if (!paintPersonPortrait(canvas, person)) {
          pending.push({ canvas: canvas, person: person, index: index });
        }
      } else {
        pending.push({ canvas: canvas, person: person, index: index });
      }
    });
    Object.keys(existing).forEach(function (npcId) {
      if (!keep[npcId] && existing[npcId].parentNode) {
        existing[npcId].parentNode.removeChild(existing[npcId]);
      }
    });
    const placeholder = listHost.querySelector('.placeholder');
    if (placeholder) listHost.removeChild(placeholder);
    scheduleRelationshipPortraits(pending, generation);
  }

  function socialDetailSignature(social, npcId, interactionId) {
    if (!social || !interactionId) return 'none';
    const gifts = Array.isArray(social.gifts)
      ? social.gifts.map(function (gift) {
        return gift.itemId + 'x' + gift.quantity;
      }).join(',')
      : '';
    return [
      npcId || '',
      interactionId,
      social.personBusy ? 1 : 0,
      gifts
    ].join('\0');
  }

  function buildSocialDetailModal(m) {
    const modal = Ui.el('div', 'modal social-detail-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', Ui.closeSocialDetailModal);
    m.refs = {
      title: Ui.el('div', 'modal-title', modal, '互动'),
      body: Ui.el('div', 'modal-body social-detail-body', modal)
    };
  }

  function openSocialDetailModal(npcId, interactionId) {
    const m = Ui.modals.socialDetail;
    if (!m) return;
    if (!m.root) {
      if (!Ui.modalRoot) return;
      m.root = Ui.el('div', 'modal-mask social-detail-mask', Ui.modalRoot);
      m.root.style.display = 'none';
    }
    if (!m.built) {
      buildSocialDetailModal(m);
      m.built = true;
    }
    Ui.relationshipUiState.selectedInteractionId = interactionId;
    m.npcId = npcId;
    m.interactionId = interactionId;
    m.signature = null;
    m.root.style.display = 'flex';
    m.root.style.pointerEvents = 'auto';
    Ui.updateSocialDetailModal(true);
  }

  function closeSocialDetailModal() {
    const m = Ui.modals.socialDetail;
    if (!m || !m.root) return;
    m.root.style.display = 'none';
    m.root.style.pointerEvents = 'none';
    m.npcId = null;
    m.interactionId = null;
    m.signature = null;
    Ui.relationshipUiState.selectedInteractionId = null;
  }

  function updateSocialDetailModal(force) {
    const m = Ui.modals.socialDetail;
    if (!m || !m.built || !m.npcId || !m.interactionId) return;
    if (m.root.style.display === 'none') return;
    const social = Ui.api().queries.social({
      npcId: m.npcId,
      includeGifts: true
    });
    const signature = socialDetailSignature(social, m.npcId, m.interactionId);
    if (!force && signature === m.signature) return;
    m.signature = signature;
    m.refs.body.innerHTML = '';
    if (!social) {
      m.refs.title.textContent = '互动';
      Ui.el('div', 'placeholder', m.refs.body, '找不到互动信息');
      return;
    }
    let action = null;
    for (let index = 0; index < social.interactions.length; index++) {
      if (social.interactions[index].id === m.interactionId) {
        action = social.interactions[index];
        break;
      }
    }
    if (!action) {
      m.refs.title.textContent = '互动';
      Ui.el('div', 'muted', m.refs.body, '该互动当前不可用');
      return;
    }
    m.refs.title.textContent = action.label;
    let detail = null;
    try {
      detail = Ui.api().queries.relationship({ npcId: m.npcId });
    } catch (error) {
      detail = null;
    }
    const npcName = (detail && detail.name) || social.npcName || '对方';
    const pronoun = (detail && detail.pronoun) || '对方';
    let startHint = '你将开始与' + npcName + '互动。';
    if (typeof SocialInteractionContent !== 'undefined' &&
        SocialInteractionContent &&
        typeof SocialInteractionContent.getNarrative === 'function') {
      startHint = SocialInteractionContent.getNarrative(
        action.id,
        'start',
        { name: npcName, pronoun: pronoun }
      );
    }
    if (social.personBusy) {
      Ui.el(
        'div',
        'social-warning',
        m.refs.body,
        '你正与对方互动中，稍后再发起新的互动'
      );
    }
    Ui.el('div', 'social-detail-meta', m.refs.body, startHint);
    Ui.el(
      'div',
      'social-detail-meta',
      m.refs.body,
      '约需 ' + Ui.fmtDur(action.durationSeconds) + ' · 可与挂机并行'
    );
    Ui.el(
      'div',
      'social-detail-meta',
      m.refs.body,
      '魅力经验 +' + action.rewards.charmXp +
        ' · 修为 +' + action.rewards.cultivation
    );
    if (action.requiresGift) {
      const select = Ui.el('select', 'gift-select', m.refs.body);
      social.gifts.forEach(function (gift) {
        Ui.addOption(
          select,
          gift.itemId,
          gift.name + ' ×' + gift.quantity
        );
      });
      const button = Ui.el('button', 'big-btn social-start', m.refs.body, '赠送');
      button.disabled = social.gifts.length === 0;
      button.addEventListener('click', function () {
        Ui.invokeCommand('startSocial', {
          npcId: m.npcId,
          interactionId: action.id,
          itemId: select.value
        });
        closeSocialDetailModal();
        Ui.closePersonDetailModal();
      });
      return;
    }
    const button = Ui.el('button', 'big-btn social-start', m.refs.body, '开始');
    button.addEventListener('click', function () {
      Ui.invokeCommand('startSocial', {
        npcId: m.npcId,
        interactionId: action.id
      });
      closeSocialDetailModal();
      Ui.closePersonDetailModal();
    });
  }

  function renderPersonInfoTab(parent, detail, socialView, options) {
    const deferSocial = !!(options && options.deferSocial);
    const summary = Ui.el('div', 'card person-detail', parent);
    const head = Ui.el('div', 'person-modal-head', summary);
    const portraitCol = Ui.el('div', 'person-modal-portrait-col', head);
    const portrait = Ui.el('div', 'person-modal-portrait', portraitCol);
    const canvas = Ui.el('canvas', 'person-modal-canvas', portrait);
    // 立绘放到下一帧，并带上已知尺寸，避免等 layout / 反复重试。
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        if (!canvas.isConnected) return;
        paintPersonPortrait(canvas, detail, {
          cssWidth: 132,
          cssHeight: 168
        });
      });
    } else {
      paintPersonPortrait(canvas, detail, {
        cssWidth: 132,
        cssHeight: 168
      });
    }
    renderPersonPortraitTags(portraitCol, detail);
    renderPersonTraits(portraitCol, detail);

    const copy = Ui.el('div', 'person-modal-copy', head);
    const nameRow = Ui.el('div', 'person-name-row', copy);
    Ui.el('div', 'card-title person-name', nameRow, detail.name);
    const topRelation = topRelationFromMetrics(detail.metrics);
    const affectionLink = Ui.el(
      'button',
      'person-affection-link person-tip-link',
      nameRow
    );
    affectionLink.type = 'button';
    affectionLink.setAttribute('data-relation-tip-trigger', '1');
    affectionLink.title =
      (Ui.RELATION_LABELS[topRelation.id] || topRelation.id) +
      ' ' +
      topRelation.value;
    appendRelationHeart(
      affectionLink,
      topRelation.id,
      'person-card-heart'
    );
    Ui.el(
      'span',
      'person-card-heart-value',
      affectionLink,
      String(topRelation.value)
    );
    affectionLink.addEventListener('click', function (event) {
      event.stopPropagation();
      hidePersonTextTip();
      if (Ui.relationTip.open) {
        hideRelationTip();
        return;
      }
      showRelationTip(detail.metrics, affectionLink);
    });
    renderPersonProfileFacts(copy, detail);
    renderPersonBreakthrough(summary, detail.breakthrough, detail.realm);

    if (detail.bond.stage === 'partner') {
      const ritualButton = Ui.el(
        'button',
        'big-btn lineage-ritual-button',
        summary,
        '共议传承仪式'
      );
      ritualButton.addEventListener('click', function () {
        Ui.invokeCommand('proposeLineageRitual', {
          partnerNpcId: detail.npcId
        });
      });
    }
    const presenceMount = Ui.el('div', 'person-presence-mount', summary);
    presenceMount.setAttribute('data-person-presence-mount', '1');
    const socialMount = Ui.el('div', 'person-social-mount', summary);
    socialMount.setAttribute('data-person-social-mount', '1');
    if (deferSocial) {
      Ui.el('div', 'muted person-detail-loading', socialMount, '互动加载中…');
    } else {
      renderPersonPresence(presenceMount, detail, socialView);
      renderSocialPanel(socialMount, detail, socialView);
    }
  }

  function fillPersonModalSocial(mountRoot, detail, social) {
    if (!mountRoot || !detail) return;
    const presenceMount = mountRoot.querySelector(
      '[data-person-presence-mount]'
    );
    const socialMount = mountRoot.querySelector('[data-person-social-mount]');
    if (presenceMount) {
      presenceMount.innerHTML = '';
      renderPersonPresence(presenceMount, detail, social);
    }
    if (socialMount) {
      socialMount.innerHTML = '';
      renderSocialPanel(socialMount, detail, social);
    }
  }

  function biographyEntryBody(entry) {
    if (typeof entry === 'string') return entry;
    if (!entry || typeof entry !== 'object') return '';
    if (typeof entry.body === 'string' && entry.body) return entry.body;
    if (typeof entry.text === 'string' && entry.text) return entry.text;
    if (entry.kind === 'lifespan-warning') {
      return '寿元将近，需要日后处理。';
    }
    return '';
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function sanitizeEventNarrative(text) {
    return String(text || '')
      .replace(/【/g, '')
      .replace(/】/g, '');
  }

  function renderLinkedNarrative(parent, text, participants, className) {
    const host = Ui.el('div', className || 'event-text', parent);
    let cleaned = sanitizeEventNarrative(text);
    const people = [];
    const seenNames = {};
    function pushPerson(person) {
      if (!person ||
          typeof person.name !== 'string' ||
          !person.name ||
          person.name === '一位修士' ||
          person.name === '某人' ||
          person.name === '无名') {
        return;
      }
      const isPlayer = person.npcId === 'player' || person.isPlayer === true;
      if (!isPlayer && !person.npcId) return;
      if (seenNames[person.name]) return;
      seenNames[person.name] = true;
      people.push({
        npcId: isPlayer ? 'player' : person.npcId,
        name: person.name,
        isPlayer: isPlayer
      });
    }
    (Array.isArray(participants) ? participants : []).forEach(pushPerson);
    let hasPlayer = people.some(function (person) { return person.isPlayer; });
    if (!hasPlayer) {
      const top = Ui.safeQuery('top', undefined, null);
      if (top && typeof top.name === 'string' && top.name.trim()) {
        const playerName = top.name.trim();
        if (cleaned.indexOf(playerName) >= 0) {
          pushPerson({ npcId: 'player', name: playerName, isPlayer: true });
        }
      }
    }
    people.sort(function (left, right) {
      return right.name.length - left.name.length;
    });
    people.forEach(function (person) {
      cleaned = cleaned.replace(
        new RegExp(escapeRegExp(person.name) + '（[^）]*）', 'g'),
        person.name
      );
    });
    if (!people.length) {
      host.textContent = cleaned;
      return host;
    }
    const pattern = people.map(function (person) {
      return escapeRegExp(person.name);
    }).join('|');
    const splitter = new RegExp('(' + pattern + ')', 'g');
    const nameToPerson = {};
    people.forEach(function (person) {
      if (!nameToPerson[person.name]) nameToPerson[person.name] = person;
    });
    cleaned.split(splitter).forEach(function (part) {
      if (!part) return;
      const person = nameToPerson[part];
      if (!person) {
        host.appendChild(document.createTextNode(part));
        return;
      }
      if (person.isPlayer) {
        const link = Ui.el('button', 'event-player-link', host, part);
        link.type = 'button';
        link.title = part;
        link.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
        });
        return;
      }
      const link = Ui.el('button', 'event-npc-link', host, part);
      link.type = 'button';
      link.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        Ui.openPersonDetailModal(person.npcId);
      });
    });
    return host;
  }

  function historyTimeLabel(entry) {
    if (!entry) return '';
    if (entry.calendarLabel) {
      if (/^\d+\s*岁$/.test(String(entry.calendarLabel))) {
        return entry.calendarLabel;
      }
      return '灵枢历 ' + entry.calendarLabel;
    }
    return '';
  }

  function renderPersonHistoryTab(parent, detail) {
    const card = Ui.el('div', 'card person-history', parent);
    const rows = [];
    if (Array.isArray(detail.history)) {
      detail.history.forEach(function (entry) {
        rows.push(entry);
      });
    }
    if (!rows.length &&
        Array.isArray(detail.biography) &&
        detail.biography.length) {
      detail.biography.forEach(function (line, index) {
        if (!line || line.type === 'pregame') return;
        if (line.type && line.type !== 'origin' &&
            line.kind !== 'lifespan-warning') {
          return;
        }
        const body = biographyEntryBody(line);
        if (!body) return;
        rows.push({
          id: 'bio-' + index,
          title: '',
          body: body,
          calendarLabel: '',
          participants: []
        });
      });
    }
    if (!rows.length) {
      Ui.el('div', 'muted', card, '尚无与对方相关的经历记录');
      return;
    }
    rows.forEach(function (entry) {
      const row = Ui.el('div', 'person-history-row', card);
      const time = historyTimeLabel(entry);
      if (time) {
        Ui.el('div', 'person-history-calendar', row, time);
      }
      const text = biographyEntryBody(entry) || entry.body || entry.title || '';
      renderLinkedNarrative(
        row,
        text,
        entry.participants,
        'person-history-body'
      );
    });
  }

  function buildPersonDetailModal(m) {
    const modal = Ui.el('div', 'modal person-detail-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', Ui.closePersonDetailModal);
    m.refs = {
      title: Ui.el('div', 'modal-title person-detail-title', modal, ''),
      tabs: Ui.el('div', 'person-modal-tabs', modal),
      body: Ui.el('div', 'modal-body person-modal-body', modal)
    };
    [
      ['info', '信息'],
      ['history', '经历']
    ].forEach(function (entry) {
      const button = Ui.el('button', 'person-modal-tab', m.refs.tabs, entry[1]);
      button.type = 'button';
      button.setAttribute('data-tab', entry[0]);
      button.addEventListener('click', function () {
        Ui.relationshipUiState.modalTab = entry[0];
        m.tab = entry[0];
        m.signature = null;
        Ui.updatePersonDetailModal(true);
      });
    });
  }

  function openPersonDetailModal(npcId) {
    const m = Ui.modals.personDetail;
    if (!m) return;
    if (!m.root) {
      if (!Ui.modalRoot) return;
      m.root = Ui.el('div', 'modal-mask', Ui.modalRoot);
      m.root.style.display = 'none';
    }
    if (!m.built) {
      buildPersonDetailModal(m);
      m.built = true;
    }
    Ui.relationshipUiState.selectedId = npcId;
    Ui.relationshipUiState.modalTab = 'info';
    Ui.relationshipUiState.selectedInteractionId = null;
    m.npcId = npcId;
    m.tab = 'info';
    m.signature = null;
    const openToken = (m.openToken || 0) + 1;
    m.openToken = openToken;
    // 先露出遮罩并让出一帧，避免查询/立绘堵在点击同步路径上。
    m.root.style.display = 'flex';
    m.root.style.pointerEvents = 'auto';
    if (m.refs && m.refs.title) {
      m.refs.title.textContent = '人物';
    }
    if (m.refs && m.refs.body) {
      m.refs.body.innerHTML = '';
      Ui.el('div', 'placeholder person-detail-loading', m.refs.body, '正在打开…');
    }
    function fill() {
      if (m.openToken !== openToken || m.npcId !== npcId) return;
      if (m.root.style.display === 'none') return;
      Ui.updatePersonDetailModal(true);
    }
    // 单帧让出即可；双 rAF 反而多等一层。
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(fill);
    } else {
      setTimeout(fill, 0);
    }
  }

  function closePersonDetailModal() {
    const m = Ui.modals.personDetail;
    if (!m || !m.root) return;
    hideRelationTip();
    hidePersonTextTip();
    closeSocialDetailModal();
    m.openToken = (m.openToken || 0) + 1;
    m.root.style.display = 'none';
    m.root.style.pointerEvents = 'none';
    m.npcId = null;
    m.signature = null;
    Ui.relationshipUiState.selectedInteractionId = null;
  }

  function updatePersonDetailModal(force) {
    const m = Ui.modals.personDetail;
    if (!m || !m.built || !m.npcId) return;
    if (m.root.style.display === 'none') return;
    const tab = Ui.relationshipUiState.modalTab === 'history'
      ? 'history'
      : 'info';
    const openToken = m.openToken;
    const npcId = m.npcId;
    let detail = null;
    try {
      detail = Ui.api().queries.relationship({
        npcId: npcId,
        includeHistory: tab === 'history'
      });
    } catch (error) {
      console.error('[relationship] person detail query failed', error);
      m.refs.body.innerHTML = '';
      Ui.el('div', 'placeholder', m.refs.body, '人物信息暂时无法打开');
      return;
    }
    // 非强制刷新时带上轻量社交；强制打开时先出资料，社交下一帧补。
    let social = null;
    if (detail && tab === 'info' && !force) {
      try {
        social = Ui.api().queries.social({
          npcId: detail.npcId,
          includeGifts: false
        });
      } catch (error) {
        social = null;
      }
    }
    const signature = relationshipDetailSignature(detail, social) +
      '\0' + tab + (tab === 'info' && !social ? '\0pending-social' : '');
    if (!force && signature === m.signature) return;
    m.signature = signature;
    m.tab = tab;
    hideRelationTip();
    hidePersonTextTip();
    Array.prototype.forEach.call(
      m.refs.tabs.children,
      function (button) {
        button.classList.toggle(
          'active',
          button.getAttribute('data-tab') === tab
        );
      }
    );
    m.refs.body.innerHTML = '';
    if (!detail) {
      Ui.el('div', 'placeholder', m.refs.body, '找不到这位人物');
      return;
    }
    if (m.refs.title) {
      m.refs.title.textContent = detail.name || '人物';
    }
    if (tab === 'history') {
      renderPersonHistoryTab(m.refs.body, detail);
      return;
    }
    if (social) {
      renderPersonInfoTab(m.refs.body, detail, social);
      return;
    }
    renderPersonInfoTab(m.refs.body, detail, null, { deferSocial: true });
    function fillSocial() {
      if (m.openToken !== openToken || m.npcId !== npcId) return;
      if (m.root.style.display === 'none') return;
      if (Ui.relationshipUiState.modalTab === 'history' || m.tab === 'history') {
        return;
      }
      let nextSocial = null;
      try {
        nextSocial = Ui.api().queries.social({
          npcId: npcId,
          includeGifts: false
        });
      } catch (error) {
        return;
      }
      fillPersonModalSocial(m.refs.body, detail, nextSocial);
      m.signature = relationshipDetailSignature(detail, nextSocial) +
        '\0info';
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(fillSocial);
    } else {
      setTimeout(fillSocial, 0);
    }
  }

  function renderRelationshipWorld() {
    const refs = Ui.contentState.refs;
    if (!refs.relationshipHost || !Ui.api().queries.relationships) return;
    if (!refs.relationshipListHost ||
        refs.relationshipListHost.parentNode !== refs.relationshipHost) {
      refs.relationshipHost.innerHTML = '';
      refs.relationshipListHost = Ui.el(
        'div',
        'person-card-grid',
        refs.relationshipHost
      );
      refs.relationshipListSignature = null;
    }

    const listKey = Ui.relationshipUiState.search + '\0' +
      Ui.relationshipUiState.sort;
    const now = Date.now();
    const listStale = !refs.relationshipListCache ||
      refs.relationshipListKey !== listKey ||
      (now - (refs.relationshipListAt || 0)) >= 2000 ||
      refs.relationshipListSignature == null;
    if (listStale) {
      refs.relationshipListCache = Ui.api().queries.relationships({
        search: Ui.relationshipUiState.search,
        sort: Ui.relationshipUiState.sort
      });
      refs.relationshipListKey = listKey;
      refs.relationshipListAt = now;
    }
    const list = refs.relationshipListCache;
    const listSignature = relationshipListSignature(list);
    if (listSignature === refs.relationshipListSignature) return;
    refs.relationshipListSignature = listSignature;
    renderRelationshipList(refs.relationshipListHost, list);
  }

  function addOption(select, value, label, className) {
    const option = Ui.el('option', className || '', select, label);
    option.value = value == null ? '' : String(value);
    return option;
  }

  function ratioBar(parent, className, label, current, maximum) {
    const max = Math.max(1, Number(maximum) || 1);
    const value = Math.max(0, Number(current) || 0);
    const bar = Ui.el('div', className, parent);
    const fill = Ui.el('div', 'meter-fill', bar);
    fill.style.width = Ui.percent(value / max) + '%';
    Ui.el('div', 'meter-text', bar, label + ' ' + value + '/' + max);
    return bar;
  }

  function buildPlaceholder(navName, c) {
    const tips = {
      '商城': '商城筹建中 · 敬请期待'
    };
    Ui.el('div', 'placeholder', c, tips[navName] || '（该功能暂未开放）');
  }

  function goToNavigation(label) {
    const navigation = Ui.api().queries.navigation();
    const index = navigation.items.findIndex(function (item) {
      return item.label === label;
    });
    if (index >= 0) Ui.invokeCommand('switchNav', { index: index });
  }

  function closeSectJoinModal() {
    const m = Ui.modals.sectJoin;
    if (!m || !m.root) return;
    m.root.style.display = 'none';
    m.root.style.pointerEvents = 'none';
    m.sectId = null;
  }

  function closeSectOfficesModal() {
    const m = Ui.modals.sectOffices;
    if (!m || !m.root) return;
    m.root.style.display = 'none';
    m.root.style.pointerEvents = 'none';
    m.sectId = null;
  }

  function closeSectMissionModal() {
    const m = Ui.modals.sectMission;
    if (!m || !m.root) return;
    m.root.style.display = 'none';
    m.root.style.pointerEvents = 'none';
    m.missionId = null;
  }

  function closeSectPavilionModal() {
    const m = Ui.modals.sectPavilion;
    if (!m || !m.root) return;
    m.root.style.display = 'none';
    m.root.style.pointerEvents = 'none';
  }

  function closeSectPavilionDetailModal() {
    const m = Ui.modals.sectPavilionDetail;
    if (!m || !m.root) return;
    m.root.style.display = 'none';
    m.root.style.pointerEvents = 'none';
    m.techniqueId = null;
  }

  function closeSectLeaveModal() {
    const m = Ui.modals.sectLeave;
    if (!m || !m.root) return;
    m.root.style.display = 'none';
    m.root.style.pointerEvents = 'none';
  }

  function formatSectRefresh(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(value / 60);
    const secs = value % 60;
    if (minutes <= 0) return secs + ' 秒后刷新';
    return minutes + ' 分 ' + secs + ' 秒后刷新';
  }

  function buildSectMissionModal(m) {
    const modal = Ui.el('div', 'modal sect-mission-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeSectMissionModal);
    m.root.addEventListener('click', function (event) {
      if (event.target === m.root) closeSectMissionModal();
    });
    m.refs = {
      title: Ui.el('div', 'modal-title', modal, '宗门任务'),
      body: Ui.el('div', 'modal-body sect-mission-body', modal),
      actions: Ui.el('div', 'sect-mission-actions', modal)
    };
  }

  function openSectMissionModal(missionId) {
    const view = Ui.api().queries.sects();
    const missions = view.joined && view.joined.missions;
    const card = missions && Array.isArray(missions.offers)
      ? missions.offers.find(function (row) { return row.id === missionId; })
      : null;
    if (!card) return;
    const m = Ui.modals.sectMission;
    if (!m.root) return;
    if (!m.built) {
      buildSectMissionModal(m);
      m.built = true;
    }
    m.missionId = missionId;
    m.refs.title.textContent = card.name;
    m.refs.body.innerHTML = '';
    m.refs.actions.innerHTML = '';
    Ui.el(
      'div',
      'sect-mission-status-pill is-' + card.status,
      m.refs.body,
      card.statusLabel
    );
    Ui.el('div', 'muted', m.refs.body, card.description || '');
    Ui.el('div', 'sect-mission-detail-title', m.refs.body, '任务目标');
    const goals = Ui.el('div', 'sect-mission-goal-list', m.refs.body);
    (card.steps || []).forEach(function (step) {
      const row = Ui.el(
        'div',
        'sect-mission-goal' + (step.ok ? ' is-ok' : ''),
        goals
      );
      Ui.el('div', 'sect-mission-goal-label', row, step.label);
      if (step.kind === 'deliver') {
        Ui.el(
          'div',
          'muted',
          row,
          '持有 ' + step.have + ' / 需要 ' + step.need
        );
        if (step.hint) {
          Ui.el('div', 'muted', row, step.hint);
        }
        if (Array.isArray(step.examples) && step.examples.length) {
          Ui.el(
            'div',
            'muted',
            row,
            '可交：' + step.examples.join('、') + '等'
          );
        }
      } else if (step.kind === 'combat') {
        Ui.el(
          'div',
          'muted',
          row,
          step.ok ? '已完成击杀' : '尚未完成挑战'
        );
      }
    });
    if (card.rewards) {
      Ui.el(
        'div',
        'sect-mission-reward',
        m.refs.body,
        '奖励：贡献 +' + (card.rewards.contribution || 0) +
          ' · 声望 +' + (card.rewards.reputation || 0) +
          ' · 灵石 +' + (card.rewards.lingshi || 0)
      );
    }
    if (card.status === 'completed') {
      Ui.el('div', 'muted', m.refs.actions, '本轮任务已完成，等待下次刷新');
    } else if (card.canAccept) {
      const accept = Ui.el('button', 'big-btn', m.refs.actions, '接取任务');
      accept.addEventListener('click', function () {
        Ui.invokeCommand('acceptSectMission', { missionId: card.id });
        closeSectMissionModal();
      });
    } else if (card.status === 'active') {
      if (card.pendingCombat) {
        const fight = Ui.el('button', 'small-btn', m.refs.actions, '前往挑战');
        fight.addEventListener('click', function () {
          closeSectMissionModal();
          Ui.invokeCommand('startSectMissionCombat', {});
        });
      }
      const claim = Ui.el(
        'button',
        'big-btn',
        m.refs.actions,
        card.canClaim ? '交付并领奖' : '条件未达成'
      );
      claim.disabled = !card.canClaim;
      claim.addEventListener('click', function () {
        if (!card.canClaim) return;
        Ui.invokeCommand('claimSectMission', {});
        closeSectMissionModal();
      });
    }
    m.root.style.display = 'flex';
    m.root.style.pointerEvents = 'auto';
  }

  function buildSectOfficesModal(m) {
    const modal = Ui.el('div', 'modal sect-offices-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeSectOfficesModal);
    m.root.addEventListener('click', function (event) {
      if (event.target === m.root) closeSectOfficesModal();
    });
    m.refs = {
      title: Ui.el('div', 'modal-title', modal, '宗门架构'),
      body: Ui.el('div', 'modal-body sect-offices-body', modal)
    };
  }

  function openSectOfficesModal(sectId) {
    const detail = Ui.api().queries.sect({ sectId: sectId });
    if (!detail) return;
    const m = Ui.modals.sectOffices;
    if (!m.root) return;
    if (!m.built) {
      buildSectOfficesModal(m);
      m.built = true;
    }
    m.sectId = sectId;
    m.refs.title.textContent = detail.name + ' · 成员架构';
    m.refs.body.innerHTML = '';
    const offices = Array.isArray(detail.offices) ? detail.offices : [];
    if (!offices.length) {
      Ui.el('div', 'placeholder', m.refs.body, '暂无职位信息');
    } else {
      const tree = Ui.el('div', 'sect-office-tree', m.refs.body);
      offices.forEach(function (office) {
        const row = Ui.el(
          'div',
          'sect-office-row' + (office.pool ? ' is-pool' : ' is-seat'),
          tree
        );
        Ui.el(
          'div',
          'sect-office-role',
          row,
          office.title + (office.pool ? '（' + office.count + '）' : '')
        );
        const names = Ui.el('div', 'sect-office-names', row);
        if (!office.members || !office.members.length) {
          Ui.el('span', 'muted', names, '虚位以待');
          return;
        }
        office.members.forEach(function (member, index) {
          if (index > 0) {
            Ui.el('span', 'sect-office-name-sep', names, '、');
          }
          const link = Ui.el('button', 'sect-office-name-link', names);
          link.type = 'button';
          link.textContent = member.name;
          link.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            closeSectOfficesModal();
            openPersonDetailModal(member.npcId);
          });
        });
      });
    }
    m.root.style.display = 'flex';
    m.root.style.pointerEvents = 'auto';
  }

  function summarizeTechniqueEffect(effect) {
    if (!effect || typeof effect !== 'object') return '效果见功法说明';
    if (effect.type === 'attack') {
      return '单体伤害 ×' + (effect.multiplier || 1) +
        (effect.defenseIgnore ? '，破防 ' + Math.round(effect.defenseIgnore * 100) + '%' : '') +
        (effect.hits ? '，连击 ' + effect.hits + ' 次' : '');
    }
    if (effect.type === 'aoeAttack') {
      return '群体伤害 ×' + (effect.multiplier || 1);
    }
    if (effect.type === 'heal') {
      return '治疗' + (effect.purge ? '并净化' : '');
    }
    if (effect.type === 'shield') return '施加护盾';
    if (effect.type === 'restoreQi') return '恢复真气';
    if (effect.type === 'guard') return '守护协战';
    if (effect.type === 'beastAttack') return '灵兽出击';
    if (effect.type === 'partyDamageBuff') return '全队增伤';
    if (effect.maxQiPercent) return '提升真气上限';
    if (effect.defensePercent) return '提升防御';
    if (effect.healPowerBonus) return '提升治疗强度';
    if (effect.shieldPowerBonus) return '提升护盾强度';
    if (effect.taggedDamageBonus) return '强化对应标签伤害';
    return '被动增益';
  }

  function buildSectLeaveModal(m) {
    const modal = Ui.el('div', 'modal sect-leave-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeSectLeaveModal);
    m.root.addEventListener('click', function (event) {
      if (event.target === m.root) closeSectLeaveModal();
    });
    m.refs = {
      title: Ui.el('div', 'modal-title', modal, '退出宗门'),
      body: Ui.el('div', 'modal-body sect-leave-body', modal),
      actions: Ui.el('div', 'sect-leave-actions', modal)
    };
    const cancel = Ui.el('button', 'small-btn', m.refs.actions, '取消');
    cancel.type = 'button';
    cancel.addEventListener('click', closeSectLeaveModal);
    m.refs.confirm = Ui.el('button', 'big-btn', m.refs.actions, '确认退宗');
    m.refs.confirm.type = 'button';
  }

  function openSectLeaveModal(view) {
    const joined = view && view.joined;
    if (!joined) return;
    const m = Ui.modals.sectLeave;
    if (!m.root) return;
    if (!m.built) {
      buildSectLeaveModal(m);
      m.built = true;
    }
    m.refs.title.textContent = '退出' + (joined.name || '宗门');
    m.refs.body.innerHTML = '';
    Ui.el(
      'div',
      'sect-leave-text',
      m.refs.body,
      '确定退出「' + (joined.name || '当前宗门') + '」吗？'
    );
    Ui.el(
      'div',
      'muted',
      m.refs.body,
      '已学会的功法会保留；当前宗门职阶将重置为弟子。退宗后可立即再选其他门派。'
    );
    m.refs.confirm.onclick = function () {
      closeSectLeaveModal();
      Ui.invokeCommand('chooseSect', { sectId: null });
    };
    m.root.style.display = 'flex';
    m.root.style.pointerEvents = 'auto';
  }

  function buildSectPavilionModal(m) {
    const modal = Ui.el('div', 'modal sect-pavilion-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeSectPavilionModal);
    m.root.addEventListener('click', function (event) {
      if (event.target === m.root) closeSectPavilionModal();
    });
    m.refs = {
      title: Ui.el('div', 'modal-title', modal, '藏宝阁'),
      body: Ui.el('div', 'modal-body sect-pavilion-body', modal)
    };
  }

  function buildSectPavilionDetailModal(m) {
    const modal = Ui.el('div', 'modal sect-pavilion-detail-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeSectPavilionDetailModal);
    m.root.addEventListener('click', function (event) {
      if (event.target === m.root) closeSectPavilionDetailModal();
    });
    m.refs = {
      title: Ui.el('div', 'modal-title', modal, '功法详情'),
      body: Ui.el('div', 'modal-body sect-pavilion-detail-body', modal),
      actions: Ui.el('div', 'sect-pavilion-detail-actions', modal)
    };
  }

  function openSectPavilionDetailModal(offer) {
    if (!offer || !offer.techniqueId) return;
    const m = Ui.modals.sectPavilionDetail;
    if (!m.root) return;
    if (!m.built) {
      buildSectPavilionDetailModal(m);
      m.built = true;
    }
    m.techniqueId = offer.techniqueId;
    m.refs.title.textContent = offer.name || '功法详情';
    m.refs.body.innerHTML = '';
    m.refs.actions.innerHTML = '';

    const head = Ui.el('div', 'sect-pavilion-detail-head', m.refs.body);
    Ui.renderTechniqueIconFace(head, {
      name: offer.name,
      kind: offer.kind,
      tags: offer.tags
    });
    const headText = Ui.el('div', 'sect-pavilion-detail-copy', head);
    Ui.el('div', 'sect-pavilion-detail-name', headText, offer.name || '');
    Ui.el(
      'div',
      'muted',
      headText,
      (offer.kind === 'passive' ? '被动功法' : '主动功法') +
        ' · ' + (offer.realmLabel || ('境界' + offer.requiredRealmIndex))
    );

    Ui.el(
      'div',
      'sect-pavilion-detail-block',
      m.refs.body,
      summarizeTechniqueEffect(offer.effect)
    );
    const meta = Ui.el('div', 'sect-pavilion-detail-meta', m.refs.body);
    Ui.el('div', 'muted', meta, '兑换门槛：' + (offer.minRankLabel || '弟子'));
    if (offer.kind === 'active') {
      Ui.el(
        'div',
        'muted',
        meta,
        '真气 ' + (offer.qiCost || 0) +
          ' · 冷却 ' + (offer.cooldownTicks || 0)
      );
    }
    Ui.el(
      'div',
      'sect-pavilion-detail-cost',
      meta,
      '消耗贡献 ' + offer.contributionCost
    );
    if (offer.lockReason && !offer.canBuy) {
      Ui.el('div', 'muted', meta, offer.lockReason);
    } else if (offer.owned) {
      Ui.el('div', 'muted', meta, '你已学会该功法');
    }

    const cancel = Ui.el('button', 'small-btn', m.refs.actions, '返回');
    cancel.type = 'button';
    cancel.addEventListener('click', closeSectPavilionDetailModal);
    const buy = Ui.el(
      'button',
      'big-btn',
      m.refs.actions,
      offer.owned ? '已学会' : ('兑换（贡献 ' + offer.contributionCost + '）')
    );
    buy.type = 'button';
    buy.disabled = !offer.canBuy;
    if (offer.canBuy) {
      buy.addEventListener('click', function () {
        const result = Ui.invokeCommand('exchangeSectTechnique', {
          techniqueId: offer.techniqueId
        });
        if (result && result.ok) {
          closeSectPavilionDetailModal();
          Ui.openSectPavilionModal();
        }
      });
    }

    m.root.style.display = 'flex';
    m.root.style.pointerEvents = 'auto';
  }

  function openSectPavilionModal() {
    const sectsView = Ui.api().queries.sects();
    const pavilion = Ui.api().queries.sectPavilion
      ? Ui.api().queries.sectPavilion()
      : null;
    if (!pavilion || !pavilion.available) return;
    const m = Ui.modals.sectPavilion;
    if (!m.root) return;
    if (!m.built) {
      buildSectPavilionModal(m);
      m.built = true;
    }
    const sectName = sectsView && sectsView.joined
      ? sectsView.joined.name
      : '宗门';
    m.refs.title.textContent = sectName + ' · 藏宝阁';
    m.refs.body.innerHTML = '';

    const status = Ui.el('section', 'sect-pavilion-status', m.refs.body);
    Ui.el(
      'div',
      'sect-pavilion-rank',
      status,
      '当前地位：' + (pavilion.rank && pavilion.rank.label
        ? pavilion.rank.label
        : '弟子')
    );
    Ui.el(
      'div',
      'muted',
      status,
      '可用贡献 ' + pavilion.contribution +
        ' · 累计贡献 ' + (pavilion.lifetimeContribution || 0) +
        ' · 任务完成 ' + (pavilion.completedMissions || 0) + ' 次'
    );

    if (pavilion.next) {
      const promoteBox = Ui.el('div', 'sect-pavilion-promote', m.refs.body);
      Ui.el(
        'div',
        'sect-panel-title',
        promoteBox,
        '晋升 → ' + pavilion.next.label
      );
      Ui.el(
        'div',
        'muted',
        promoteBox,
        '需要：贡献 ' + pavilion.next.minContribution +
          ' · 任务 ' + pavilion.next.minMissions +
          ' 次 · 境界序号 ' + pavilion.next.minRealm
      );
      if (pavilion.promotion &&
          Array.isArray(pavilion.promotion.reasons) &&
          pavilion.promotion.reasons.length) {
        pavilion.promotion.reasons.forEach(function (reason) {
          Ui.el('div', 'muted', promoteBox, '· ' + reason);
        });
      }
      if (pavilion.canPromote) {
        const promote = Ui.el('button', 'small-btn', promoteBox, '申请晋升');
        promote.type = 'button';
        promote.addEventListener('click', function () {
          Ui.invokeCommand('promoteSectDisciple');
          openSectPavilionModal();
        });
      } else {
        Ui.el('div', 'muted', promoteBox, '条件未满，继续做宗门任务并积累贡献');
      }
    } else {
      Ui.el('div', 'muted', m.refs.body, '你已达到当前可晋升的最高弟子地位');
    }

    Ui.el('div', 'sect-panel-title', m.refs.body, '本宗功法');
    const groups = Array.isArray(pavilion.offerGroups) && pavilion.offerGroups.length
      ? pavilion.offerGroups
      : [{
        realmLabel: '功法',
        requiredRealmIndex: 0,
        offers: pavilion.offers || []
      }];
    if (!groups.length ||
        groups.every(function (group) {
          return !group.offers || !group.offers.length;
        })) {
      Ui.el('div', 'placeholder', m.refs.body, '暂无可兑换功法');
    } else {
      groups.forEach(function (group) {
        if (!group.offers || !group.offers.length) return;
        const section = Ui.el('section', 'sect-pavilion-realm', m.refs.body);
        Ui.el(
          'div',
          'sect-pavilion-realm-title',
          section,
          group.realmLabel || ('境界' + group.requiredRealmIndex)
        );
        const grid = Ui.el('div', 'sect-pavilion-grid', section);
        group.offers.forEach(function (offer) {
          const tile = Ui.el(
            'button',
            'sect-pavilion-tile' + (offer.canBuy ? '' : ' is-locked') +
              (offer.owned ? ' is-owned' : ''),
            grid
          );
          tile.type = 'button';
          Ui.renderTechniqueIconFace(tile, {
            name: offer.name,
            kind: offer.kind,
            tags: offer.tags
          }, { locked: !offer.canBuy && !offer.owned });
          Ui.el('div', 'sect-pavilion-tile-name', tile, offer.name || '');
          tile.addEventListener('click', function () {
            openSectPavilionDetailModal(offer);
          });
        });
      });
    }

    m.root.style.display = 'flex';
    m.root.style.pointerEvents = 'auto';
  }

  function buildSects(c) {
    const refs = Ui.contentState.refs;
    if (!Ui.api().queries.sects) {
      Ui.buildReserve(c, 'reserve-stage4', '宗门', '宗门系统尚未开放');
      return;
    }
    refs.sectPage = Ui.el('div', 'sect-page', c);
  }

  function renderSectBrowse(host, view) {
    if (view.spiritualRootName) {
      const rootHint = Ui.el('div', 'muted sect-root-hint', host);
      rootHint.textContent = '你的灵根：' + view.spiritualRootName;
    }
    if (view.choiceOnCooldown && view.choiceCooldownSeconds > 0) {
      Ui.el(
        'div',
        'sect-cooldown-hint',
        host,
        '暂时无法选择门派' +
          (view.choiceCooldownLabel
            ? '（剩余 ' + view.choiceCooldownLabel + '）'
            : '')
      );
    }
    const list = Ui.el('div', 'region-list sect-card-list', host);
    (view.sects || []).forEach(function (sect) {
      const card = Ui.el(
        'button',
        'card region-card world-region-card sect-pick-card' +
          (sect.requirementsMet ? '' : ' is-locked'),
        list
      );
      card.type = 'button';
      const media = Ui.el('div', 'world-region-media sect-pick-media', card);
      Ui.el('div', 'world-region-media-label', media, '宗门图');
      if (sect.requirementsMet) {
        Ui.el('div', 'world-region-here-badge', media, '可申请');
      }
      const body = Ui.el('div', 'world-region-body', card);
      const head = Ui.el('div', 'world-region-card-head', body);
      Ui.el('div', 'card-title', head, sect.name);
      Ui.el(
        'div',
        'world-region-type',
        head,
        sect.requirementsMet ? '可加入' : '未满足'
      );
      Ui.el('div', 'muted', body, sect.description || '');
      Ui.el(
        'div',
        'region-population',
        body,
        '势力 ' + sect.power + ' · 名望 ' + sect.reputation
      );
      card.addEventListener('click', function () {
        if (view.choiceOnCooldown) {
          Ui.showToast('暂时无法更换宗门身份，请稍后再来');
          return;
        }
        Ui.openSectJoinModal(sect.id);
      });
    });
  }

  function renderSectMissionPanel(host, joined) {
    const missions = joined.missions || {
      offers: [],
      nextRefreshIn: 0
    };
    const panel = Ui.el('section', 'sect-mission-board', host);
    const head = Ui.el('div', 'sect-panel-head', panel);
    Ui.el('div', 'sect-panel-title', head, '宗门任务');
    Ui.el(
      'div',
      'muted sect-mission-refresh',
      head,
      formatSectRefresh(missions.nextRefreshIn)
    );
    const row = Ui.el('div', 'sect-mission-card-row', panel);
    const offers = Array.isArray(missions.offers) ? missions.offers : [];
    if (!offers.length) {
      Ui.el('div', 'muted', row, '暂无任务，稍后再来');
      return;
    }
    offers.forEach(function (card) {
      const item = Ui.el(
        'button',
        'sect-mission-card is-' + card.status,
        row
      );
      item.type = 'button';
      Ui.el('div', 'sect-mission-card-status', item, card.statusLabel);
      Ui.el('div', 'sect-mission-card-name', item, card.name);
      Ui.el(
        'div',
        'muted sect-mission-card-goal',
        item,
        card.objectiveText || card.description || ''
      );
      item.addEventListener('click', function () {
        openSectMissionModal(card.id);
      });
    });
  }

  function renderSectInterior(host, view) {
    const joined = view.joined;
    if (!joined) {
      Ui.el('div', 'placeholder', host, '宗门资料暂不可用');
      return;
    }
    const hero = Ui.el('section', 'sect-interior-hero', host);
    const titleRow = Ui.el('div', 'sect-interior-title-row', hero);
    Ui.el('div', 'sect-interior-name', titleRow, joined.name);
    if (view.canLeave) {
      const leave = Ui.el('button', 'sect-leave-mini', titleRow, '退宗');
      leave.type = 'button';
      leave.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        openSectLeaveModal(view);
      });
    }
    Ui.el('div', 'sect-interior-desc', hero, joined.description || '');
    const meta = Ui.el('div', 'sect-interior-meta', hero);
    Ui.el(
      'span',
      'sect-meta-chip',
      meta,
      '贡献 ' + joined.contribution
    );
    Ui.el(
      'span',
      'sect-meta-chip',
      meta,
      '声望 ' + joined.playerReputation
    );
    Ui.el(
      'span',
      'sect-meta-chip',
      meta,
      joined.discipleRankLabel || '弟子'
    );
    if (Array.isArray(joined.traits)) {
      joined.traits.slice(0, 3).forEach(function (trait) {
        Ui.el('span', 'sect-meta-chip soft', meta, trait);
      });
    }

    renderSectMissionPanel(host, joined);

    const pavilionEntry = Ui.el('div', 'sect-office-entry-card', host);
    const pavilionText = Ui.el('div', 'sect-office-entry-copy', pavilionEntry);
    Ui.el('div', 'sect-panel-title', pavilionText, '藏宝阁');
    Ui.el(
      'div',
      'muted',
      pavilionText,
      '以贡献兑换本宗功法，地位越高可换越强'
    );
    const openPavilion = Ui.el(
      'button',
      'sect-office-entry-go',
      pavilionEntry,
      '进入'
    );
    openPavilion.type = 'button';
    openPavilion.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      openSectPavilionModal();
    });
  }

  function sectViewSignature(view) {
    if (!view || typeof view !== 'object') return '';
    // 每帧 live 调用，禁止对整页 view 深拷贝/全量 stringify。
    if (view.wandering) {
      const sects = Array.isArray(view.sects) ? view.sects : [];
      let out = 'w|' + (view.choiceOnCooldown ? 1 : 0) + '|' +
        (view.spiritualRootId || '') + '|' + sects.length;
      for (let i = 0; i < sects.length; i++) {
        const row = sects[i];
        out += '|' + row.id + ':' + (row.canJoin ? 1 : 0) + ':' +
          (row.requirementsMet ? 1 : 0) + ':' +
          Math.floor(Number(row.power) || 0);
      }
      return out;
    }
    const joined = view.joined;
    if (!joined) return 'empty';
    const missions = joined.missions || {};
    const offers = Array.isArray(missions.offers) ? missions.offers : [];
    let out = 'j|' + joined.id + '|' +
      Math.floor(Number(joined.contribution) || 0) + '|' +
      Math.floor(Number(joined.playerReputation) || 0) + '|' +
      (joined.discipleRank || 'disciple') + '|' +
      (view.canLeave ? 1 : 0) + '|' +
      (missions.needsRefresh ? 1 : 0) + '|' +
      offers.length;
    for (let i = 0; i < offers.length; i++) {
      const card = offers[i];
      out += '|' + card.id + ':' + (card.status || '') + ':' +
        (card.statusLabel || '') + ':' +
        (card.canClaim ? 1 : 0) + ':' +
        (card.canAccept ? 1 : 0) + ':' +
        (card.objectiveText || '');
    }
    return out;
  }

  function refreshSectMissionCountdown(host, view) {
    if (!host || !view || !view.joined || !view.joined.missions) return;
    const node = host.querySelector('.sect-mission-refresh');
    if (!node) return;
    node.textContent = formatSectRefresh(view.joined.missions.nextRefreshIn);
  }

  function liveSects() {
    const refs = Ui.contentState.refs;
    if (!refs.sectPage) return;
    const now = Date.now();
    // 宗门查询仍含任务看板；限制为约 4Hz，倒计时每帧本地递减。
    const due = !refs.sectQueryAt || (now - refs.sectQueryAt) >= 250 ||
      refs.sectForceRefresh === true;
    if (!due) {
      if (refs.sectLastRefreshAt != null && refs.sectLastNextRefreshIn != null) {
        const elapsed = Math.floor((now - refs.sectLastRefreshAt) / 1000);
        const remain = Math.max(0, refs.sectLastNextRefreshIn - elapsed);
        refreshSectMissionCountdown(refs.sectPage, {
          joined: { missions: { nextRefreshIn: remain } }
        });
      }
      return;
    }
    refs.sectForceRefresh = false;
    refs.sectQueryAt = now;
    const a = Ui.api();
    // 禁止在 live 循环里调用 refreshSectMissionBoard：
    // 那会走 commitModel（双次 normalize + 存档），曾经因 boardResolved
    // 被 normalize 丢掉而每 250ms 存一次，导致宗门页全程卡顿。
    const view = a.queries.sects();
    if (view.joined && view.joined.missions) {
      refs.sectLastRefreshAt = now;
      refs.sectLastNextRefreshIn = Math.max(
        0,
        Math.floor(Number(view.joined.missions.nextRefreshIn) || 0)
      );
    } else {
      refs.sectLastRefreshAt = null;
      refs.sectLastNextRefreshIn = null;
    }
    const signature = sectViewSignature(view);
    if (refs.sectSignature === signature) {
      refreshSectMissionCountdown(refs.sectPage, view);
      return;
    }
    refs.sectSignature = signature;
    refs.sectPage.innerHTML = '';
    if (view.wandering) {
      renderSectBrowse(refs.sectPage, view);
    } else {
      renderSectInterior(refs.sectPage, view);
    }
  }


  function buildSectJoinModal(m) {
    const modal = Ui.el('div', 'modal sect-join-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeSectJoinModal);
    m.root.addEventListener('click', function (event) {
      if (event.target === m.root) closeSectJoinModal();
    });
    m.refs = {
      title: Ui.el('div', 'modal-title', modal, '加入宗门'),
      body: Ui.el('div', 'modal-body sect-join-body', modal),
      actions: Ui.el('div', 'sect-join-actions', modal)
    };
    const cancel = Ui.el(
      'button',
      'small-btn sect-join-cancel',
      m.refs.actions,
      '再看看'
    );
    cancel.type = 'button';
    cancel.addEventListener('click', closeSectJoinModal);
    m.refs.confirm = Ui.el(
      'button',
      'big-btn sect-join-confirm',
      m.refs.actions,
      '确认加入'
    );
    m.refs.confirm.type = 'button';
  }

  function openSectJoinModal(sectId) {
    const view = Ui.api().queries.sects();
    const sect = (view.sects || []).find(function (row) {
      return row.id === sectId;
    });
    if (!sect) return;
    const m = Ui.modals.sectJoin;
    if (!m.root) return;
    if (!m.built) {
      buildSectJoinModal(m);
      m.built = true;
    }
    m.sectId = sectId;
    m.refs.title.textContent = '加入' + sect.name;
    m.refs.body.innerHTML = '';
    Ui.el('div', 'muted', m.refs.body, sect.description || '');
    Ui.el('div', 'sect-join-section-title', m.refs.body, '加入要求');
    const list = Ui.el('div', 'sect-req-list', m.refs.body);
    const requirements = Array.isArray(sect.requirements)
      ? sect.requirements
      : [];
    if (!requirements.length) {
      Ui.el('div', 'muted', list, '暂无额外门槛');
    } else {
      requirements.forEach(function (req) {
        const row = Ui.el(
          'div',
          'sect-req-row' + (req.ok ? ' is-met' : ' is-miss'),
          list
        );
        Ui.el(
          'div',
          'sect-req-mark',
          row,
          req.ok ? '已满足' : '未满足'
        );
        Ui.el('div', 'sect-req-label', row, req.label || '加入要求');
      });
    }
    if (view.spiritualRootName) {
      Ui.el(
        'div',
        'muted sect-join-root',
        m.refs.body,
        '你的灵根：' + view.spiritualRootName
      );
    }
    m.refs.confirm.disabled = !sect.canJoin;
    m.refs.confirm.textContent = sect.canJoin
      ? '确认加入'
      : '尚未满足要求';
    m.refs.confirm.onclick = function () {
      if (!sect.canJoin) return;
      Ui.invokeCommand('chooseSect', { sectId: sect.id });
      closeSectJoinModal();
    };
    m.root.style.display = 'flex';
    m.root.style.pointerEvents = 'auto';
  }

  function buildWorld(c) {
    const refs = Ui.contentState.refs;
    if (!Ui.api().queries.world) {
      Ui.buildReserve(c, 'reserve-stage4', '天下', '天下演变尚未开放');
      return;
    }
    refs.worldTools = null;
    refs.worldScope = null;
    refs.worldRegion = null;
    refs.worldHost = Ui.el('div', 'world-page', c);
    refs.worldPeopleHost = null;
  }

  function liveWorld() {
    Ui.renderWorldPage();
  }

  function openWorldRegion(regionId) {
    if (!regionId) return;
    Ui.worldUiState.view = 'detail';
    Ui.worldUiState.regionId = regionId;
    Ui.contentState.refs.worldSignature = null;
    Ui.renderWorldPage();
  }

  function backToWorldRegions() {
    Ui.worldUiState.view = 'list';
    Ui.contentState.refs.worldSignature = null;
    Ui.renderWorldPage();
  }

  function closeTravelConfirmModal() {
    const m = Ui.modals.travelConfirm;
    if (!m || !m.root) return;
    m.root.style.display = 'none';
    m.root.style.pointerEvents = 'none';
    m.regionId = null;
  }

  function buildTravelConfirmModal(m) {
    const modal = Ui.el('div', 'modal travel-confirm-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeTravelConfirmModal);
    m.root.addEventListener('click', function (event) {
      if (event.target === m.root) closeTravelConfirmModal();
    });
    m.refs = {
      title: Ui.el('div', 'modal-title', modal, '前往此地'),
      body: Ui.el('div', 'modal-body travel-confirm-body', modal),
      actions: Ui.el('div', 'travel-confirm-actions', modal)
    };
    const cancel = Ui.el(
      'button',
      'small-btn travel-confirm-cancel',
      m.refs.actions,
      '取消'
    );
    cancel.type = 'button';
    cancel.addEventListener('click', closeTravelConfirmModal);
    m.refs.confirm = Ui.el(
      'button',
      'big-btn travel-confirm-go',
      m.refs.actions,
      '确认前往'
    );
    m.refs.confirm.type = 'button';
  }

  function openTravelConfirmModal(region) {
    if (!region || !region.id) return;
    const m = Ui.modals.travelConfirm;
    if (!m.root) return;
    if (!m.built) {
      buildTravelConfirmModal(m);
      m.built = true;
    }
    m.regionId = region.id;
    const travel = region.travel || {};
    const duration = travel.durationLabel || '一段时间';
    m.refs.title.textContent = '前往' + (region.name || '此地');
    m.refs.body.innerHTML = '';
    Ui.el(
      'div',
      'travel-confirm-text',
      m.refs.body,
      '是否启程前往「' + (region.name || '此地') + '」？'
    );
    Ui.el(
      'div',
      'travel-confirm-duration',
      m.refs.body,
      '预计耗时：' + duration
    );
    if (travel.fromName) {
      Ui.el(
        'div',
        'muted',
        m.refs.body,
        '从' + travel.fromName + '出发'
      );
    }
    m.refs.confirm.onclick = function () {
      const result = Ui.invokeCommand('travelToRegion', {
        regionId: region.id
      });
      if (!result || !result.ok) return;
      closeTravelConfirmModal();
      openWorldRegion(region.id);
    };
    m.root.style.display = 'flex';
    m.root.style.pointerEvents = 'auto';
  }

  function onWorldRegionCardClick(region) {
    if (!region || !region.id) return;
    if (region.isHere) {
      openWorldRegion(region.id);
      return;
    }
    openTravelConfirmModal(region);
  }

  function renderWorldRegionCards(host, view) {
    const regionSection = Ui.el('section', 'world-section', host);
    Ui.el('div', 'section-title', regionSection, '地区');
    const regionList = Ui.el('div', 'region-list', regionSection);
    view.regions.forEach(function (region) {
      const card = Ui.el(
        'button',
        'card region-card world-region-card' +
          (region.isHere ? ' is-here' : ''),
        regionList
      );
      card.type = 'button';
      const media = Ui.el('div', 'world-region-media', card);
      if (region.isHere) {
        Ui.el('div', 'world-region-here-badge', media, '当前位置');
      }
      Ui.el('div', 'world-region-media-label', media, '地区图');
      const body = Ui.el('div', 'world-region-body', card);
      const head = Ui.el('div', 'world-region-card-head', body);
      Ui.el('div', 'card-title', head, region.name);
      Ui.el(
        'div',
        'world-region-type',
        head,
        Ui.WORLD_REGION_TYPE_LABELS[region.type] || '地区'
      );
      Ui.el('div', 'muted', body, region.description);
      Ui.el(
        'div',
        'region-population',
        body,
        '在此活动：' + region.peopleCount + ' 人'
      );
      card.addEventListener('click', function () {
        onWorldRegionCardClick(region);
      });
    });
  }

  function renderWorldRegionDetail(host, view) {
    const refs = Ui.contentState.refs;
    const region = view.selectedRegion;
    if (!region) {
      Ui.el('div', 'placeholder', host, '未找到该地区');
      refs.worldPeopleHost = null;
      return;
    }
    const detail = Ui.el('div', 'card world-region-detail', host);
    const top = Ui.el('div', 'world-region-detail-top', detail);
    const back = Ui.el('button', 'small-btn world-back-btn', top, '返回');
    back.type = 'button';
    back.addEventListener('click', backToWorldRegions);
    Ui.el(
      'div',
      'world-region-type',
      top,
      Ui.WORLD_REGION_TYPE_LABELS[region.type] || '地区'
    );
    const main = Ui.el('div', 'world-region-detail-main', detail);
    const media = Ui.el(
      'div',
      'world-region-media world-region-media-detail',
      main
    );
    if (view.playerRegion && view.playerRegion.id === region.id) {
      Ui.el('div', 'world-region-here-badge', media, '当前位置');
    }
    Ui.el('div', 'world-region-media-label', media, '地区图');
    const info = Ui.el('div', 'world-region-detail-info', main);
    Ui.el('div', 'card-title', info, region.name);
    Ui.el('div', 'muted', info, region.description || '');
    Ui.el(
      'div',
      'region-population',
      info,
      '在此活动：' + region.peopleCount + ' 人'
    );

    const peopleSection = Ui.el('section', 'world-section', host);
    Ui.el('div', 'section-title', peopleSection, '此地人物');
    const peopleList = Ui.el(
      'div',
      'person-card-grid world-people',
      peopleSection
    );
    refs.worldPeopleHost = peopleList;
    if (!view.people.length) {
      Ui.el('div', 'placeholder', peopleList, '这处暂时没有人活动');
      return;
    }
    renderRelationshipList(peopleList, { people: view.people });
  }

  function worldPageSignature(view) {
    if (!view) return 'null';
    const parts = [
      Ui.worldUiState.view,
      view.regionId || '',
      view.playerRegion && view.playerRegion.id || ''
    ];
    const regions = view.regions || [];
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      parts.push(
        region.id + ':' + (region.peopleCount || 0) +
          (region.isHere ? '*' : '') +
          ':' + (region.travel && region.travel.durationLabel || '')
      );
    }
    const people = view.people || [];
    parts.push('p' + people.length);
    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      parts.push(
        (person.id || person.npcId || '') + ':' +
          (person.affection || 0) + ':' +
          (person.realmStage || person.realm || '')
      );
    }
    return parts.join('|');
  }

  function eventPageSignature(view) {
    if (!view) return 'null';
    const items = view.items || [];
    const parts = [
      items.length,
      view.counts && view.counts.world || 0,
      view.unreadCounts && view.unreadCounts.world || 0
    ];
    for (let i = 0; i < items.length; i++) {
      parts.push(items[i].id || '');
    }
    return parts.join('|');
  }

  function renderWorldPage() {
    const refs = Ui.contentState.refs;
    if (!refs.worldHost) return;
    const queryInput = Ui.worldUiState.view === 'detail' && Ui.worldUiState.regionId
      ? { regionId: Ui.worldUiState.regionId }
      : {};
    const view = Ui.api().queries.world(queryInput);
    const signature = worldPageSignature(view);
    if (refs.worldSignature === signature) return;
    refs.worldSignature = signature;
    refs.worldHost.innerHTML = '';
    refs.worldPeopleHost = null;
    if (Ui.worldUiState.view === 'detail') {
      renderWorldRegionDetail(refs.worldHost, view);
      return;
    }
    renderWorldRegionCards(refs.worldHost, view);
  }

  function buildEvents(c) {
    const refs = Ui.contentState.refs;
    const initialView = Ui.api().queries.events();
    if (initialView.stage4Available !== true) {
      Ui.el('div', 'card-title', c, '大事记');
      refs.offlineReports = null;
      Ui.buildReserve(
        c,
        'reserve-stage4',
        '事件',
        '人物事件与世界演变将在人物与事件阶段开放'
      );
      return;
    }
    Ui.eventUiState.section = 'world';
    Ui.el('div', 'card-title', c, '大事记');
    refs.eventTabs = null;
    refs.worldFilters = null;
    refs.offlineReports = null;
    refs.eventHost = Ui.el('div', 'event-list', c);
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
      telemetryCountText(display.dungeonClears, '秘境通关：', '×')
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
      Ui.el('div', 'combat-report-line', parent, text);
    });
  }

  function liveEvents() {
    Ui.renderEventSection();
  }

  function renderEventSection() {
    const refs = Ui.contentState.refs;
    if (!refs.eventHost) return;
    const view = Ui.api().queries.events({ section: 'world' });
    const signature = eventPageSignature(view);
    if (refs.eventSignature === signature) return;
    refs.eventSignature = signature;
    refs.eventHost.innerHTML = '';
    if (!view.items.length) {
      Ui.el(
        'div',
        'placeholder',
        refs.eventHost,
        '江湖尚安静，稍后再来翻大事记'
      );
    }
    view.items.forEach(function (row) {
      const card = Ui.el('div', 'card event-card', refs.eventHost);
      if (row.calendarLabel) {
        Ui.el('div', 'event-calendar', card, '灵枢历 ' + row.calendarLabel);
      }
      const text = row.body || row.title || '';
      if (text) {
        renderLinkedNarrative(card, text, row.participants, 'event-body');
      }
    });
    Ui.api().commands.markEventSectionRead({
      section: 'world',
      ids: view.items.map(function (row) { return row.id; })
    });
  }

  // ============================================================
  // 弹窗
  // ============================================================

  Ui.buildRelationship = buildRelationship;
  Ui.liveRelationship = liveRelationship;
  Ui.refreshPersonSocialProgress = refreshPersonSocialProgress;
  Ui.refreshPersonBreakthroughProgress = refreshPersonBreakthroughProgress;
  Ui.relationHeartClass = relationHeartClass;
  Ui.relationTagClass = relationTagClass;
  Ui.appendRelationHeart = appendRelationHeart;
  Ui.metricPersonToPlayer = metricPersonToPlayer;
  Ui.topRelationFromMetrics = topRelationFromMetrics;
  Ui.isPersonTipTrigger = isPersonTipTrigger;
  Ui.ensureRelationTip = ensureRelationTip;
  Ui.ensurePersonTextTip = ensurePersonTextTip;
  Ui.hideRelationTip = hideRelationTip;
  Ui.hidePersonTextTip = hidePersonTextTip;
  Ui.showRelationTip = showRelationTip;
  Ui.showPersonTextTip = showPersonTextTip;
  Ui.relationDisplayValue = relationDisplayValue;
  Ui.relationTierText = relationTierText;
  Ui.relationTagTone = relationTagTone;
  Ui.fmtDurCompact = fmtDurCompact;
  Ui.shortInteractionLabel = shortInteractionLabel;
  Ui.romanceTendencyLabel = romanceTendencyLabel;
  Ui.pickPresenceVignette = pickPresenceVignette;
  Ui.buildPersonPresenceText = buildPersonPresenceText;
  Ui.renderPersonPresence = renderPersonPresence;
  Ui.renderSocialPanel = renderSocialPanel;
  Ui.personFactTipBody = personFactTipBody;
  Ui.renderPersonProfileFacts = renderPersonProfileFacts;
  Ui.renderPersonTraits = renderPersonTraits;
  Ui.renderPersonPortraitTags = renderPersonPortraitTags;
  Ui.formatCultivationEfficiency = formatCultivationEfficiency;
  Ui.renderPersonBreakthrough = renderPersonBreakthrough;
  Ui.relationshipListSignature = relationshipListSignature;
  Ui.relationshipDetailSignature = relationshipDetailSignature;
  Ui.personPortraitSeed = personPortraitSeed;
  Ui.paintPersonPortrait = paintPersonPortrait;
  Ui.personCardNameText = personCardNameText;
  Ui.updatePersonCardContent = updatePersonCardContent;
  Ui.createPersonCard = createPersonCard;
  Ui.scheduleRelationshipPortraits = scheduleRelationshipPortraits;
  Ui.renderRelationshipList = renderRelationshipList;
  Ui.socialDetailSignature = socialDetailSignature;
  Ui.buildSocialDetailModal = buildSocialDetailModal;
  Ui.openSocialDetailModal = openSocialDetailModal;
  Ui.closeSocialDetailModal = closeSocialDetailModal;
  Ui.updateSocialDetailModal = updateSocialDetailModal;
  Ui.renderPersonInfoTab = renderPersonInfoTab;
  Ui.fillPersonModalSocial = fillPersonModalSocial;
  Ui.biographyEntryBody = biographyEntryBody;
  Ui.escapeRegExp = escapeRegExp;
  Ui.sanitizeEventNarrative = sanitizeEventNarrative;
  Ui.renderLinkedNarrative = renderLinkedNarrative;
  Ui.historyTimeLabel = historyTimeLabel;
  Ui.renderPersonHistoryTab = renderPersonHistoryTab;
  Ui.buildPersonDetailModal = buildPersonDetailModal;
  Ui.openPersonDetailModal = openPersonDetailModal;
  Ui.closePersonDetailModal = closePersonDetailModal;
  Ui.updatePersonDetailModal = updatePersonDetailModal;
  Ui.renderRelationshipWorld = renderRelationshipWorld;
  Ui.addOption = addOption;
  Ui.ratioBar = ratioBar;
  Ui.buildPlaceholder = buildPlaceholder;
  Ui.goToNavigation = goToNavigation;
  Ui.closeSectJoinModal = closeSectJoinModal;
  Ui.closeSectOfficesModal = closeSectOfficesModal;
  Ui.closeSectMissionModal = closeSectMissionModal;
  Ui.closeSectPavilionModal = closeSectPavilionModal;
  Ui.closeSectPavilionDetailModal = closeSectPavilionDetailModal;
  Ui.closeSectLeaveModal = closeSectLeaveModal;
  Ui.formatSectRefresh = formatSectRefresh;
  Ui.buildSectMissionModal = buildSectMissionModal;
  Ui.openSectMissionModal = openSectMissionModal;
  Ui.buildSectOfficesModal = buildSectOfficesModal;
  Ui.openSectOfficesModal = openSectOfficesModal;
  Ui.summarizeTechniqueEffect = summarizeTechniqueEffect;
  Ui.buildSectLeaveModal = buildSectLeaveModal;
  Ui.openSectLeaveModal = openSectLeaveModal;
  Ui.buildSectPavilionModal = buildSectPavilionModal;
  Ui.buildSectPavilionDetailModal = buildSectPavilionDetailModal;
  Ui.openSectPavilionDetailModal = openSectPavilionDetailModal;
  Ui.openSectPavilionModal = openSectPavilionModal;
  Ui.buildSects = buildSects;
  Ui.renderSectBrowse = renderSectBrowse;
  Ui.renderSectMissionPanel = renderSectMissionPanel;
  Ui.renderSectInterior = renderSectInterior;
  Ui.sectViewSignature = sectViewSignature;
  Ui.refreshSectMissionCountdown = refreshSectMissionCountdown;
  Ui.liveSects = liveSects;
  Ui.buildSectJoinModal = buildSectJoinModal;
  Ui.openSectJoinModal = openSectJoinModal;
  Ui.buildWorld = buildWorld;
  Ui.liveWorld = liveWorld;
  Ui.openWorldRegion = openWorldRegion;
  Ui.backToWorldRegions = backToWorldRegions;
  Ui.closeTravelConfirmModal = closeTravelConfirmModal;
  Ui.buildTravelConfirmModal = buildTravelConfirmModal;
  Ui.openTravelConfirmModal = openTravelConfirmModal;
  Ui.onWorldRegionCardClick = onWorldRegionCardClick;
  Ui.renderWorldRegionCards = renderWorldRegionCards;
  Ui.renderWorldRegionDetail = renderWorldRegionDetail;
  Ui.worldPageSignature = worldPageSignature;
  Ui.eventPageSignature = eventPageSignature;
  Ui.renderWorldPage = renderWorldPage;
  Ui.buildEvents = buildEvents;
  Ui.telemetryCountText = telemetryCountText;
  Ui.renderCombatTelemetry = renderCombatTelemetry;
  Ui.liveEvents = liveEvents;
  Ui.renderEventSection = renderEventSection;

  Ui.registerPage('relationship', { build: function (nav, host) { buildRelationship(host); }, live: function () { liveRelationship(false); } });
  Ui.registerPage('sects', { build: function (nav, host) { buildSects(host); }, live: function () { liveSects(); } });
  Ui.registerPage('world', { build: function (nav, host) { buildWorld(host); }, live: function () { liveWorld(); } });
  Ui.registerPage('events', { build: function (nav, host) { buildEvents(host); }, live: function () { liveEvents(); } });

})();
