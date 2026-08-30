// ============================================================
// ui-combat.js — XiuxianUi page module (classic script, no bundler)
// ============================================================
(function () {
  var Ui = window.XiuxianUi = window.XiuxianUi || {};
    'use strict';

  function buildCombat(c) {
    c.classList.add('combat-page');
    const refs = Ui.contentState.refs;
    refs.combatTabs = Ui.el('div', 'combat-tabs', c);
    refs.combatHost = Ui.el('div', 'combat-host', c);
    refs.combatSignature = null;
    Ui.COMBAT_TABS.forEach(function (entry) {
      const button = Ui.el('button', 'combat-tab', refs.combatTabs, entry[1]);
      button.addEventListener('click', function () {
        Ui.combatUiState.tab = entry[0];
        Ui.renderCombatView();
      });
    });
    Ui.renderCombatView();
  }

  function liveCombat() {
    Ui.renderCombatView();
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

  function battleMeter(parent, cls, label) {
    const bar = Ui.el('div', 'battle-meter ' + cls, parent);
    const fill = Ui.el('div', 'battle-meter-fill', bar);
    const text = Ui.el('div', 'battle-meter-text', bar, label || '');
    return { root: bar, fill: fill, text: text };
  }

  function battleActionRow(parent) {
    const row = Ui.el('div', 'battle-action', parent);
    Ui.el('div', 'battle-action-label', row, '出手');
    const track = Ui.el('div', 'battle-action-track', row);
    const fill = Ui.el('div', 'battle-action-fill', track);
    return { root: row, fill: fill };
  }

  // 阵营容器：我方阵营 / 敌方阵营。内部 .battle-units 可容纳多个单位，
  // 为多对多战斗预留接口（当前每方固定 1 个）。
  function buildBattleFaction(parent, side) {
    const root = Ui.el('div', 'battle-faction battle-faction-' + side, parent);
    const unitsHost = Ui.el('div', 'battle-units', root);
    return { root: root, unitsHost: unitsHost, units: [] };
  }

  // 单个战斗单位卡片：名字 → 头像 → 气血/资源条 → 技能格
  function buildBattleUnit(unitsHost, side, hasTechniques) {
    const card = Ui.el('div', 'battle-unit battle-unit-' + side, unitsHost);
    card.style.setProperty(
      '--battle-border',
      side === 'player'
        ? 'rgba(80, 140, 105, 1)'
        : 'rgba(188, 70, 50, 1)'
    );
    const fxLayer = Ui.el('div', 'battle-fx-layer', card);
    const head = Ui.el('div', 'battle-side-head', card);
    const name = Ui.el('div', 'battle-side-name', head, '');
    const rank = Ui.el('span', 'battle-side-rank', head, '');
    rank.style.display = 'none';
    const wrap = Ui.el('div', 'battle-portrait-wrap', card);
    let portrait;
    if (side === 'player') {
      portrait = Ui.el('canvas', 'battle-portrait', wrap);
    } else {
      portrait = Ui.el('div', 'battle-portrait battle-enemy-visual', wrap);
    }
    const respawn = Ui.el('div', 'battle-respawn', wrap, '');
    respawn.style.display = 'none';
    const meters = Ui.el('div', 'battle-meters', card);
    const hp = battleMeter(meters, 'hp', '');
    // 对标参考图：双条结构。我方=气血+真气；敌方=气血+出手蓄力
    const qi = side === 'player'
      ? battleMeter(meters, 'qi', '')
      : battleMeter(meters, 'action', '');
    const chips = Ui.el('div', 'battle-status-chips', card);
    let skills = null;
    if (hasTechniques) skills = Ui.buildBattleUnitSkills(card);
    return {
      card: card, name: name, rank: rank, wrap: wrap,
      portrait: portrait, respawn: respawn, fxLayer: fxLayer,
      hp: hp, qi: side === 'player' ? qi : null,
      action: side === 'player' ? null : { root: null, fill: qi.fill },
      actionMeter: side === 'player' ? null : qi,
      chips: chips, skills: skills, side: side
    };
  }

  function buildBattleUnitSkills(parent) {
    const host = Ui.el('div', 'battle-unit-skills', parent);
    const slots = [];
    // 4 格：第 1 格具名普攻 + 最多 3 格可配置功法
    for (let index = 0; index < 4; index++) {
      const slot = Ui.el('div', 'skill-slot empty', host);
      const cd = Ui.el('div', 'skill-cd', slot);
      const glyph = Ui.el('div', 'skill-glyph', slot, '');
      const badge = Ui.el('div', 'skill-badge', slot, '');
      slots.push({ root: slot, cd: cd, glyph: glyph, badge: badge });
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
      while (host.childNodes.length > Ui.BATTLE_LOG_LIMIT) {
        host.removeChild(host.lastChild);
      }
    }
  }

  function buildBattleScreen(host, active) {
    host.innerHTML = '';
    const screen = Ui.el('div', 'battle-screen', host);

    const head = Ui.el('div', 'battle-head', screen);
    const retreat = Ui.el('button', 'battle-retreat', head, '撤退');
    retreat.addEventListener('click', function () {
      Ui.invokeCommand('stopAction');
    });
    // 食物配置：与撤退、场景名同一排（梅尔沃式：左停战、右场景）
    const suppliesHost = Ui.el('div', 'battle-supplies', head);
    const headMain = Ui.el('div', 'battle-head-main', head);
    const title = Ui.el('div', 'battle-title', headMain, '');
    const waveText = Ui.el('div', 'battle-wave-text', headMain, '');

    const arena = Ui.el('div', 'battle-arena', screen);
    // 对标参考挂机战斗：上方敌方，下方我方；日志放战利品下方，避免中间大条打断对阵
    const enemyFaction = buildBattleFaction(arena, 'enemy');
    Ui.el('div', 'battle-vs', arena, '⚔');
    const playerFaction = buildBattleFaction(arena, 'player');

    const lootPanel = Ui.el('div', 'battle-loot-panel', screen);
    const lootHead = Ui.el('div', 'battle-loot-head', lootPanel);
    const lootTitle = Ui.el('div', 'battle-loot-title', lootHead, '本次获得 · 已入储物袋');
    const lootCount = Ui.el('div', 'battle-loot-count', lootHead, '0 种');
    const lootList = Ui.el('div', 'battle-loot-list', lootPanel);
    const logHost = Ui.el('div', 'battle-log', screen);

    const a = Ui.api();
    const top = Ui.safeQuery('top', undefined, null);
    const playerName = top && top.name ? top.name : '无名';

    const battle = {
      built: true,
      layout: 'scalar',
      actionKey: active.actionKey,
      screen: screen,
      title: title,
      waveText: waveText,
      headMain: headMain,
      suppliesHost: suppliesHost,
      suppliesText: null,
      playerFaction: playerFaction,
      enemyFaction: enemyFaction,
      logHost: logHost,
      lootPanel: lootPanel,
      lootTitle: lootTitle,
      lootCount: lootCount,
      lootList: lootList,
      lootSignature: null,
      player: null,
      enemy: null,
      prev: null,
      lastFxId: null
    };
    Ui.contentState.refs.battle = battle;
    battle.player = Ui.syncBattleUnits(battle, playerFaction, active.player, 'player', active, null);
    battle.enemy = Ui.syncBattleUnits(battle, enemyFaction, active.enemy, 'enemy', active, null);
    if (battle.player && battle.player.portrait &&
        a && a.render && battle.player.portrait.getContext) {
      a.render.drawCharacter(battle.player.portrait);
    }
    battle.player.name.textContent = playerName;
    return battle;
  }

  function buildTeamBattleScreen(host, active) {
    host.innerHTML = '';
    const screen = Ui.el('div', 'battle-screen team-battle-screen', host);
    const head = Ui.el('div', 'battle-head', screen);
    const retreat = Ui.el('button', 'battle-retreat', head, '撤退');
    retreat.addEventListener('click', function () {
      Ui.invokeCommand('stopAction');
    });
    const headMain = Ui.el('div', 'battle-head-main', head);
    const title = Ui.el('div', 'battle-title', headMain, '');
    const waveText = Ui.el('div', 'battle-wave-text', headMain, '');

    const arena = Ui.el('div', 'battle-arena team-battle-arena', screen);
    const enemiesHost = Ui.el(
      'div',
      'team-battle-row team-battle-enemies',
      arena
    );
    Ui.el('div', 'battle-vs', arena, '⚔');
    const alliesHost = Ui.el(
      'div',
      'team-battle-row team-battle-allies',
      arena
    );
    const lootPanel = Ui.el('div', 'battle-loot-panel', screen);
    const lootHead = Ui.el('div', 'battle-loot-head', lootPanel);
    const lootTitle = Ui.el('div', 'battle-loot-title', lootHead, '本次获得 · 已入储物袋');
    const lootCount = Ui.el('div', 'battle-loot-count', lootHead, '0 种');
    const lootList = Ui.el('div', 'battle-loot-list', lootPanel);
    const battle = {
      built: true,
      layout: 'vertical-team',
      actionKey: active.actionKey,
      screen: screen,
      title: title,
      waveText: waveText,
      headMain: headMain,
      enemies: { host: enemiesHost, units: [], signature: null },
      allies: { host: alliesHost, units: [], signature: null },
      logHost: null,
      lootPanel: lootPanel,
      lootTitle: lootTitle,
      lootCount: lootCount,
      lootList: lootList,
      lootSignature: null,
      lastFxId: null
    };
    Ui.contentState.refs.battle = battle;
    return battle;
  }

  function buildTeamBattleUnit(host, side) {
    const unitSide = side || 'enemy';
    const card = Ui.el(
      'article',
      'team-unit battle-unit battle-unit-' + unitSide,
      host
    );
    card.style.setProperty(
      '--battle-border',
      unitSide === 'player'
        ? 'rgba(80, 140, 105, 1)'
        : 'rgba(188, 70, 50, 1)'
    );
    const fxLayer = Ui.el('div', 'battle-fx-layer', card);
    const name = Ui.el('div', 'team-unit-name battle-side-name', card, '');
    const wrap = Ui.el('div', 'battle-portrait-wrap', card);
    const portrait = Ui.el('div', 'battle-portrait battle-enemy-visual', wrap);
    const bars = Ui.el('div', 'team-unit-bars battle-meters', card);
    const hp = Ui.el('div', 'team-unit-bar battle-meter hp', bars);
    const hpFill = Ui.el('span', 'battle-meter-fill', hp);
    const hpText = Ui.el('div', 'battle-meter-text', hp, '');
    const qi = Ui.el('div', 'team-unit-bar battle-meter qi', bars);
    const qiFill = Ui.el('span', 'battle-meter-fill', qi);
    const qiText = Ui.el('div', 'battle-meter-text', qi, '');
    const skills = buildBattleUnitSkills(card);
    return {
      card: card,
      name: name,
      portrait: portrait,
      fxLayer: fxLayer,
      side: unitSide,
      hpFill: hpFill,
      qiFill: qiFill,
      hpText: hpText,
      qiText: qiText,
      skills: skills
    };
  }

  function updateTeamBattleSkills(refs, unit) {
    if (!refs || !refs.skills) return;
    const techniques = Array.isArray(unit.techniques) ? unit.techniques : [];
    const slotCount = refs.skills.length;
    // 第 1 格具名普攻已由 combatUnitTechniqueRows 注入；无数据时留空。
    const rows = techniques;
    for (let index = 0; index < slotCount; index++) {
      const slot = refs.skills[index];
      const row = rows[index];
      if (!row || !row.techniqueId) {
        slot.root.className = 'skill-slot empty';
        slot.glyph.textContent = '';
        slot.badge.textContent = '';
        slot.badge.style.display = 'none';
        slot.cd.style.height = '0%';
        slot.root.title = '空技能格';
        continue;
      }
      const glyph = typeof row.glyph === 'string' && row.glyph
        ? row.glyph
        : (typeof row.name === 'string' && row.name
          ? row.name.charAt(0)
          : '技');
      slot.glyph.textContent = glyph;
      const total = Math.max(1, Number(row.cooldownTicks) || 1);
      const remaining = Math.max(0, Number(row.remainingCooldownTicks) || 0);
      const remainSeconds = Math.ceil(remaining * Ui.BATTLE_TICK_SECONDS);
      slot.cd.style.height =
        Math.round(Math.min(1, remaining / total) * 100) + '%';
      if (remainSeconds > 0) {
        slot.badge.textContent = String(remainSeconds);
        slot.badge.style.display = '';
      } else if (row.qiCost > 0) {
        slot.badge.textContent = String(row.qiCost);
        slot.badge.style.display = '';
      } else {
        slot.badge.textContent = '';
        slot.badge.style.display = 'none';
      }
      slot.root.className = 'skill-slot' + (remaining > 0 ? ' cooling' : '');
      slot.root.title = (row.name || '技能') +
        (row.qiCost ? ' · 真气 ' + row.qiCost : '') +
        (remainSeconds > 0 ? ' · 冷却 ' + remainSeconds + 's' : '');
    }
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
    const hpLabel = Math.round(hp) + ' / ' + Math.round(hpMax);
    const qiLabel = Math.round(qi) + ' / ' + Math.round(qiMax);
    refs.hpText.textContent = hpLabel;
    if (refs.qiText) refs.qiText.textContent = qiLabel;
    updateTeamBattleSkills(refs, unit);
    if (refs.portrait) {
      const mark = [
        refs.side,
        unit.id || '',
        unit.sourceType || '',
        unit.name || '',
        unit.rank || 'normal',
        unit.portraitSrc || ''
      ].join('|');
      if (refs.portraitMark !== mark) {
        refs.portraitMark = mark;
        if (unit.sourceType === 'player') {
          if (refs.portrait.tagName !== 'CANVAS') {
            const canvas = document.createElement('canvas');
            canvas.className = 'battle-portrait';
            refs.portrait.parentNode.replaceChild(canvas, refs.portrait);
            refs.portrait = canvas;
          }
          const a = Ui.api();
          if (a && a.render && refs.portrait.getContext) {
            a.render.drawCharacter(refs.portrait);
          }
        } else if (refs.side === 'player') {
          Ui.renderAllyPortrait(refs.portrait, unit);
        } else {
          Ui.renderEnemyPortrait(refs.portrait, {
            name: unit.name,
            rank: unit.rank || 'normal',
            enemyId: unit.sourceId || unit.id,
            portraitSrc: unit.portraitSrc || ''
          });
        }
      }
    }
  }

  function syncTeamBattleUnits(group, rows, side) {
    const units = Array.isArray(rows) ? rows : [];
    const signature = side + ':' +
      units.map(function (unit) { return unit.id; }).join('|');
    if (group.signature !== signature) {
      group.signature = signature;
      group.host.innerHTML = '';
      group.host.dataset.count = String(units.length || 0);
      group.units = units.map(function () {
        return buildTeamBattleUnit(group.host, side);
      });
    }
    group._rows = units;
    units.forEach(function (unit, index) {
      updateTeamBattleUnit(group.units[index], unit);
    });
  }

  function battleSceneLabel(active) {
    if (!active) return '战斗';
    const title = typeof active.title === 'string' && active.title
      ? active.title
      : '';
    if (active.mode === 'dungeon') {
      return title || '秘境战斗';
    }
    let enemyName = '';
    if (active.enemy && typeof active.enemy.name === 'string') {
      enemyName = active.enemy.name;
    } else if (Array.isArray(active.enemies) && active.enemies.length) {
      const first = active.enemies[0];
      if (first && typeof first.name === 'string') enemyName = first.name;
    }
    if (title && enemyName) return title + ' · ' + enemyName;
    if (title) return title;
    if (enemyName) return enemyName;
    return '战斗';
  }

  function updateBattleLocationHead(battle, active) {
    const isDungeon = active && active.mode === 'dungeon';
    if (battle.headMain) {
      battle.headMain.style.display = '';
    }
    if (battle.title) {
      battle.title.style.display = '';
      battle.title.textContent = battleSceneLabel(active);
    }
    if (battle.waveText) {
      battle.waveText.style.display = isDungeon ? '' : 'none';
    }
  }

  function updateTeamBattleScreen(battle, active) {
    updateBattleLocationHead(battle, active);
    if (active.mode === 'dungeon') {
      const wave = active.wave || {};
      const waveParts = [];
      if (Number.isFinite(wave.number)) {
        waveParts.push('第 ' + wave.number + ' 波');
      }
      if (Number.isFinite(wave.defeated) && wave.defeated > 0) {
        waveParts.push('已击败 ' + wave.defeated);
      }
      battle.waveText.textContent = waveParts.join(' · ');
    } else if (battle.waveText) {
      battle.waveText.textContent = '';
    }
    syncTeamBattleUnits(battle.enemies, active.enemies, 'enemy');
    syncTeamBattleUnits(battle.allies, active.allies, 'player');
    Ui.playNewBattleActions(battle, active);
    Ui.renderBattleLoot(battle, active.lootLog);
  }

  function findBattleUnitRefs(battle, side, unitId) {
    if (!battle) return null;
    if (battle.layout === 'vertical-team') {
      const group = side === 'player' ? battle.allies : battle.enemies;
      if (!group || !Array.isArray(group.units)) return null;
      const rows = group._rows || [];
      for (let index = 0; index < group.units.length; index++) {
        if (rows[index] && rows[index].id === unitId) {
          return group.units[index];
        }
      }
      return group.units[0] || null;
    }
    return side === 'player' ? battle.player : battle.enemy;
  }

  function playPortraitSwing(unitRefs, direction) {
    const portrait = unitRefs && unitRefs.portrait;
    if (!portrait || !portrait.classList) return;
    if (portrait._fxSwingEnd) {
      portrait.removeEventListener('animationend', portrait._fxSwingEnd);
      portrait._fxSwingEnd = null;
    }
    portrait.classList.remove('fx-portrait-swing-pos', 'fx-portrait-swing-neg');
    portrait.style.transform = '';
    void portrait.offsetWidth;
    const cls = direction > 0
      ? 'fx-portrait-swing-pos'
      : 'fx-portrait-swing-neg';
    portrait.classList.add(cls);
    const onEnd = function (event) {
      if (event && event.target !== portrait) return;
      if (event && event.animationName &&
          event.animationName !== 'battlePortraitSwingPos' &&
          event.animationName !== 'battlePortraitSwingNeg') {
        return;
      }
      portrait.classList.remove('fx-portrait-swing-pos', 'fx-portrait-swing-neg');
      portrait.style.transform = '';
      portrait.removeEventListener('animationend', onEnd);
      if (portrait._fxSwingEnd === onEnd) portrait._fxSwingEnd = null;
    };
    portrait._fxSwingEnd = onEnd;
    portrait.addEventListener('animationend', onEnd);
  }

  function playBorderFlash(unitRefs) {
    const card = unitRefs && unitRefs.card;
    if (!card || !card.classList) return;
    if (card._fxBorderEnd) {
      card.removeEventListener('animationend', card._fxBorderEnd);
      card._fxBorderEnd = null;
    }
    card.classList.remove('fx-border-hit');
    void card.offsetWidth;
    card.classList.add('fx-border-hit');
    const onEnd = function (event) {
      if (event && event.target !== card) return;
      if (event && event.animationName &&
          event.animationName !== 'battleBorderHit') {
        return;
      }
      card.classList.remove('fx-border-hit');
      card.removeEventListener('animationend', onEnd);
      if (card._fxBorderEnd === onEnd) card._fxBorderEnd = null;
    };
    card._fxBorderEnd = onEnd;
    card.addEventListener('animationend', onEnd);
  }

  function resolveBattleFloatSpec(action) {
    // 优先级：闪避 → 伤害/暴击 → 治疗 → 格挡 → 其他技能
    if (!action.hit) {
      return {
        text: '闪避',
        color: 'rgba(162, 150, 122, 1)',
        host: 'target',
        crit: false
      };
    }
    if (action.damage > 0) {
      if (action.critical) {
        return {
          text: '暴击 -' + Math.floor(action.damage),
          color: 'rgba(195, 160, 72, 1)',
          host: 'target',
          crit: true
        };
      }
      return {
        text: '-' + Math.floor(action.damage),
        color: 'rgba(188, 70, 50, 1)',
        host: 'target',
        crit: false
      };
    }
    if (action.heal > 0) {
      return {
        text: '+' + Math.floor(action.heal),
        color: 'rgba(80, 140, 105, 1)',
        host: 'source',
        crit: false
      };
    }
    if (action.skillType === 'attack' && action.damage === 0) {
      return {
        text: '格挡',
        color: 'rgba(162, 150, 122, 1)',
        host: 'target',
        crit: false
      };
    }
    return {
      text: action.skillName || '出招',
      color: 'rgba(195, 160, 72, 1)',
      host: 'source',
      crit: false
    };
  }

  function spawnBattleActionFloat(unitRefs, action, spec) {
    if (!unitRefs || !unitRefs.fxLayer || !spec) return;
    const node = document.createElement('div');
    const offset = ((action.id % 3) - 1) * 8;
    node.className = 'battle-fx-float' + (spec.crit ? ' crit' : '');
    node.textContent = spec.text;
    node.style.color = spec.color;
    node.style.setProperty('--fx-x', offset + 'px');
    unitRefs.fxLayer.appendChild(node);
    const onEnd = function () {
      if (node.parentNode) node.parentNode.removeChild(node);
      node.removeEventListener('animationend', onEnd);
    };
    node.addEventListener('animationend', onEnd);
  }

  function playBattleActionFx(battle, action) {
    if (!battle || !action) return;
    const source = findBattleUnitRefs(battle, action.side, action.sourceId);
    const target = findBattleUnitRefs(
      battle,
      action.targetSide,
      action.targetId
    );
    // 仅攻击行动晃动头像：玩家 direction=1，敌人 direction=-1
    if (action.skillType === 'attack') {
      playPortraitSwing(source, action.side === 'player' ? 1 : -1);
    }
    const floatSpec = resolveBattleFloatSpec(action);
    const floatHost = floatSpec.host === 'source' ? source : target;
    spawnBattleActionFloat(floatHost, action, floatSpec);
    if (action.damage > 0) playBorderFlash(target);
  }

  function playNewBattleActions(battle, active) {
    const actions = active && Array.isArray(active.actions)
      ? active.actions
      : [];
    if (battle.lastFxId == null) {
      let maxId = 0;
      for (let index = 0; index < actions.length; index++) {
        const id = Number(actions[index] && actions[index].id) || 0;
        if (id > maxId) maxId = id;
      }
      battle.lastFxId = maxId;
      return;
    }
    for (let index = 0; index < actions.length; index++) {
      const action = actions[index];
      const id = Number(action && action.id) || 0;
      if (id <= battle.lastFxId) continue;
      playBattleActionFx(battle, action);
      battle.lastFxId = id;
    }
  }

  function updateBattleMeter(meter, label, current, maximum, extra) {
    const max = Math.max(1, Number(maximum) || 1);
    const value = Math.max(0, Number(current) || 0);
    meter.fill.style.width =
      Math.round(Math.max(0, Math.min(1, value / max)) * 100) + '%';
    // 参考图数字居中样式：194 / 1000；标签仅在有附加说明时保留
    const base = Math.round(value) + ' / ' + Math.round(max);
    meter.text.textContent = extra
      ? base + ' ' + extra
      : base;
    if (meter.root) {
      meter.root.title = (label || '') + ' ' + base;
    }
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
      const seconds = Math.ceil(row.remainingTicks * Ui.BATTLE_TICK_SECONDS);
      Ui.el(
        'span',
        'status-chip status-' + row.id,
        host,
        (Ui.BATTLE_STATUS_LABELS[row.id] || row.id) + ' ' + seconds + 's'
      );
    });
  }

  function battleEnemyGlyph(name) {
    return typeof name === 'string' && name.length > 0
      ? name.charAt(0)
      : '妖';
  }

  function escapeXml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 无正式立绘时的 SVG 占位：按名字派生色相保持可辨识
  function enemyPortraitPalette(seed) {
    let hash = 0;
    const text = String(seed || '妖');
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return {
      hide: 'hsl(' + hue + ', 38%, 42%)',
      belly: 'hsl(' + ((hue + 24) % 360) + ', 42%, 72%)',
      eye: '#2A2430',
      horn: 'hsl(' + ((hue + 300) % 360) + ', 45%, 58%)',
      accent: 'hsl(' + ((hue + 180) % 360) + ', 40%, 55%)'
    };
  }

  function enemyPortraitSvgMarkup(name, rank) {
    const glyph = battleEnemyGlyph(name);
    const colors = enemyPortraitPalette(name);
    const elite = rank === 'elite' || rank === 'boss';
    const boss = rank === 'boss';
    return '' +
      '<svg class="enemy-portrait-svg" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect width="96" height="96" rx="14" fill="#F3EEE4"/>' +
      (boss
        ? '<circle cx="48" cy="48" r="40" fill="none" stroke="' + colors.horn + '" stroke-width="3" opacity=".55"/>'
        : '') +
      '<ellipse cx="48" cy="58" rx="26" ry="22" fill="' + colors.hide + '"/>' +
      '<ellipse cx="48" cy="62" rx="16" ry="12" fill="' + colors.belly + '"/>' +
      '<circle cx="48" cy="34" r="18" fill="' + colors.hide + '"/>' +
      '<circle cx="41" cy="33" r="3.2" fill="' + colors.eye + '"/>' +
      '<circle cx="55" cy="33" r="3.2" fill="' + colors.eye + '"/>' +
      '<circle cx="41.8" cy="32.2" r="1" fill="#FFF"/>' +
      '<circle cx="55.8" cy="32.2" r="1" fill="#FFF"/>' +
      '<path d="M40 41 Q48 46 56 41" fill="none" stroke="' + colors.eye + '" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M30 28 Q24 16 34 20" fill="' + colors.horn + '"/>' +
      '<path d="M66 28 Q72 16 62 20" fill="' + colors.horn + '"/>' +
      (elite
        ? '<circle cx="48" cy="18" r="4" fill="' + colors.accent + '"/>'
        : '') +
      '<text x="48" y="88" text-anchor="middle" font-size="11" font-weight="700" fill="#6E675C">' +
        escapeXml(glyph) +
      '</text>' +
      '</svg>';
  }

  function resolveEnemyPortraitSrc(info) {
    if (info && typeof info.portraitSrc === 'string' && info.portraitSrc) {
      return info.portraitSrc;
    }
    const enemyId = info && (info.enemyId || info.id);
    if (typeof enemyId === 'string' && enemyId) {
      return 'assets/enemy-portraits/256/' + enemyId + '.png';
    }
    return '';
  }

  function renderEnemyPortrait(host, info) {
    if (!host) return;
    const name = info && info.name ? info.name : '敌人';
    const rank = info && info.rank ? info.rank : 'normal';
    const portraitSrc = resolveEnemyPortraitSrc(info);
    host.setAttribute('title', name);
    if (portraitSrc) {
      host.className =
        'battle-portrait battle-enemy-visual has-art rank-' + rank;
      host.innerHTML = '';
      const img = document.createElement('img');
      img.className = 'enemy-portrait-img';
      img.alt = name;
      img.decoding = 'async';
      img.src = portraitSrc;
      img.addEventListener('error', function () {
        host.className =
          'battle-portrait battle-enemy-visual has-svg rank-' + rank;
        host.innerHTML = Ui.enemyPortraitSvgMarkup(name, rank);
      });
      host.appendChild(img);
      return;
    }
    host.className =
      'battle-portrait battle-enemy-visual has-svg rank-' + rank;
    host.innerHTML = Ui.enemyPortraitSvgMarkup(name, rank);
  }

  function renderAllyPortrait(host, unit) {
    if (!host) return;
    host.className = 'battle-portrait battle-ally-visual';
    const label = unit && unit.name ? battleEnemyGlyph(unit.name) : '我';
    host.innerHTML = '' +
      '<svg class="enemy-portrait-svg" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect width="96" height="96" rx="14" fill="#EAF3EA"/>' +
      '<circle cx="48" cy="36" r="16" fill="#D8C3A5"/>' +
      '<path d="M28 78 Q48 52 68 78" fill="#7EB0A0"/>' +
      '<text x="48" y="40" text-anchor="middle" font-size="16" font-weight="700" fill="#5C564C">' +
        escapeXml(label) +
      '</text>' +
      '</svg>';
  }

  function diffBattleFrame(battle, active) {
    playNewBattleActions(battle, active);
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
    Ui.updateBattleUnit(unit, unitView, side, active);
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
        renderEnemyPortrait(unit.portrait, {
          name: unitView.name,
          rank: unitView.rank || 'normal',
          enemyId: unitView.id,
          portraitSrc: unitView.portraitSrc || ''
        });
        updateBattleMeter(unit.hp, '气血', unitView.hp, unitView.maxHp);
        if (unit.actionMeter) {
          const interval = Math.max(1, Number(unitView.attackIntervalTicks) || 1);
          const cooldown = Math.max(0, Number(unitView.cooldownTicks) || 0);
          updateBattleMeter(
            unit.actionMeter,
            '出手',
            interval - cooldown,
            interval
          );
        } else if (unit.action && unit.action.fill) {
          unit.action.fill.style.width =
            Math.round(battleAttackProgress(unitView) * 100) + '%';
        }
        updateBattleChips(unit.chips, unitView.statusEffects);
      } else {
        unit.card.classList.add('waiting');
        unit.portrait.style.display = 'none';
        unit.respawn.style.display = '';
        const waitSeconds = Math.max(
          0,
          active.wave.intermissionTicks * Ui.BATTLE_TICK_SECONDS
        );
        unit.respawn.textContent =
          '下一个对手即将现身…' +
          (waitSeconds > 0 ? waitSeconds.toFixed(1) + 's' : '');
        unit.name.textContent = '——';
        unit.rank.style.display = 'none';
        updateBattleMeter(unit.hp, '气血', 0, 1);
        if (unit.actionMeter) {
          updateBattleMeter(unit.actionMeter, '出手', 0, 1);
        } else if (unit.action && unit.action.fill) {
          unit.action.fill.style.width = '0%';
        }
        updateBattleChips(unit.chips, []);
      }
      return;
    }
    // ── 我方 ──
    updateBattleMeter(
      unit.hp, '气血', unitView.hp, unitView.maxHp,
      unitView.shield > 0 ? '（盾 ' + Math.round(unitView.shield) + '）' : ''
    );
    if (unit.qi) {
      updateBattleMeter(unit.qi, '真气', unitView.qi, unitView.maxQi);
    }
    updateBattleChips(unit.chips, unitView.statusEffects);
    if (unit.skills) {
      const techniques = Array.isArray(active.techniques)
        ? active.techniques
        : [];
      const action = active.currentAction;
      const techUnlock = Math.max(
        0,
        Math.min(3, Number(active.unlockedActiveSlots) || 0)
      );
      for (let index = 0; index < unit.skills.length; index++) {
        const slot = unit.skills[index];
        // index 0 = 具名普攻，始终解锁；1..3 对应功法槽解锁数
        if (index > 0 && index > techUnlock) {
          slot.root.className = 'skill-slot locked';
          slot.glyph.textContent = '';
          slot.badge.textContent = '';
          slot.badge.style.display = 'none';
          slot.cd.style.height = '0%';
          slot.root.title = '未解锁';
          continue;
        }
        const row = techniques[index];
        if (!row || !row.techniqueId) {
          slot.root.className = 'skill-slot empty';
          slot.glyph.textContent = '';
          slot.badge.textContent = '';
          slot.badge.style.display = 'none';
          slot.cd.style.height = '0%';
          slot.root.title = '空技能格';
          continue;
        }
        const glyph = typeof row.glyph === 'string' && row.glyph
          ? row.glyph
          : (typeof row.name === 'string' && row.name
            ? row.name.charAt(0)
            : '技');
        slot.glyph.textContent = glyph;
        const total = Math.max(1, row.cooldownTicks);
        const remaining = Math.max(0, row.remainingCooldownTicks);
        const remainSeconds = Math.ceil(remaining * Ui.BATTLE_TICK_SECONDS);
        slot.cd.style.height =
          Math.round(Math.min(1, remaining / total) * 100) + '%';
        if (remainSeconds > 0) {
          slot.badge.textContent = String(remainSeconds);
          slot.badge.style.display = '';
        } else if (row.qiCost > 0) {
          slot.badge.textContent = String(row.qiCost);
          slot.badge.style.display = '';
        } else {
          slot.badge.textContent = '';
          slot.badge.style.display = 'none';
        }
        const casting = action && action.id === row.techniqueId &&
          remaining >= total - 2;
        slot.root.className = 'skill-slot' +
          (remaining > 0 ? ' cooling' : '') + (casting ? ' casting' : '');
        slot.root.title = row.name +
          (row.qiCost ? ' · 真气 ' + row.qiCost : '') +
          (remainSeconds > 0 ? ' · 冷却 ' + remainSeconds + 's' : '');
      }
    }
  }

  // 食物配置：图标卡片格位（显示在秘境名字下方）
  function renderBattleSupplies(battle, loadouts) {
    const loadout = activeLoadoutForBattle(loadouts);
    const supplies = loadout && Array.isArray(loadout.supplies)
      ? loadout.supplies.map(function (row) {
        return (Ui.SUPPLY_LABELS[row.slot] || row.slot) + '：' +
          (row.itemId ? (row.name || '未知物品') : '未配置') +
          (row.itemId ? ' ×' + (row.owned || 0) : '');
      }).join('　')
      : '未配置补给';
    if (battle.suppliesText === supplies) return;
    battle.suppliesText = supplies;
    battle.suppliesHost.innerHTML = '';
    if (!loadout || !Array.isArray(loadout.supplies) ||
        !loadout.supplies.length) {
      Ui.el('div', 'battle-supply empty', battle.suppliesHost, '未配置补给');
      return;
    }
    loadout.supplies.forEach(function (row) {
      const label = Ui.SUPPLY_LABELS[row.slot] || row.slot || '食';
      const name = row.itemId ? (row.name || label) : label;
      const tipData = row.itemId
        ? Ui.resolveItemTipData({
          itemId: row.itemId,
          name: row.name,
          owned: row.owned
        })
        : null;
      const cell = Ui.el(
        'div',
        'battle-supply' + (row.itemId ? '' : ' empty'),
        battle.suppliesHost
      );
      const icon = Ui.el('div', 'battle-supply-icon', cell);
      Ui.renderItemIcon(icon, tipData, { fallback: name.charAt(0) });
      Ui.el('div', 'battle-supply-name', cell, name);
      Ui.el('div', 'battle-supply-count', cell,
        row.itemId ? ('×' + (row.owned || 0)) : '空');
      if (tipData) Ui.attachItemTipTrigger(cell, tipData);
    });
  }

  function updateBattleScreen(battle, active, loadouts) {
    updateBattleLocationHead(battle, active);
    const wave = active.wave;
    if (active.mode === 'dungeon') {
      const waveParts = [];
      waveParts.push('第 ' + wave.number +
        (wave.waveCount ? '/' + wave.waveCount : '') + ' 波');
      if (wave.enemyTotal) {
        waveParts.push('本波 ' + Math.min(wave.defeated, wave.enemyTotal) +
          '/' + wave.enemyTotal);
      }
      if (active.phase && active.phase.number > 1) {
        waveParts.push('阶段 ' + active.phase.number);
      }
      battle.waveText.textContent = waveParts.join(' · ');
    } else if (battle.waveText) {
      battle.waveText.textContent = '';
    }

    battle.player = syncBattleUnits(
      battle, battle.playerFaction, active.player, 'player', active, loadouts
    );
    battle.enemy = syncBattleUnits(
      battle, battle.enemyFaction, active.enemy, 'enemy', active, loadouts
    );

    renderBattleSupplies(battle, loadouts);
    Ui.renderBattleLoot(battle, active.lootLog);

    diffBattleFrame(battle, active);
  }

  function setBattleLootCount(battle, count) {
    if (!battle.lootCount) return;
    battle.lootCount.textContent = Math.max(0, Number(count) || 0) + ' 种';
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
      setBattleLootCount(battle, 0);
      Ui.el('div', 'battle-loot-empty', battle.lootList, '暂无战利品');
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
    setBattleLootCount(battle, keys.length);
    if (!keys.length) {
      Ui.el('div', 'battle-loot-empty', battle.lootList, '暂无战利品');
      return;
    }
    const grid = Ui.el('div', 'loot-grid', battle.lootList);
    keys.forEach(function (key) {
      Ui.buildLootCell(grid, merged[key]);
    });
    battle.lootList.scrollTop = battle.lootList.scrollHeight;
  }

  // 单个战利品方格：浅色底板 + 下方名称 + 右下圆形数量
  function buildLootCell(host, data) {
    const cell = Ui.el('div', 'loot-cell q-' + data.quality, host);
    if (data.currency) cell.classList.add('currency');
    Ui.renderItemIcon(Ui.el('div', 'loot-icon', cell), data);
    Ui.el('div', 'loot-name', cell, data.name);
    const count = Number(data.count) || 0;
    if (count > 0) {
      Ui.el('div', 'loot-qty', cell, String(count));
    }
    cell.title = data.name + (count > 1 ? ' ×' + count : '');
    if (!data.currency && data.itemId) {
      Ui.attachItemTipTrigger(cell, data);
    }
  }

  function renderBattleScreen(host, active, loadouts) {
    let battle = Ui.contentState.refs.battle;
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
    const card = Ui.el('div', 'card pending-loot', host);
    Ui.el('div', 'card-title', card, '待领取战利品');
    const list = Ui.el('div', 'pending-loot-list', card);
    if (Array.isArray(pending.itemRows) && pending.itemRows.length) {
      pending.itemRows.forEach(function (row) {
        const line = Ui.el('div', 'pending-loot-row', list);
        Ui.renderItemLine(
          line,
          Object.assign({ itemId: row.itemId || row.id }, row),
          row.name + ' ×' + row.count
        );
      });
    } else if (pending.items && typeof pending.items === 'object') {
      Object.keys(pending.items).forEach(function (itemId) {
        const line = Ui.el('div', 'pending-loot-row', list);
        Ui.renderItemLine(
          line,
          { itemId: itemId, count: pending.items[itemId] },
          itemId + ' ×' + pending.items[itemId]
        );
      });
    } else {
      Ui.el('div', 'pending-loot-row', list, '无物品');
    }
    Ui.el('div', 'pending-loot-currency', list, '灵石 ×' + (pending.currency || 0));
    const required = Math.max(0, Number(pending.requiredFreeSlots) || 0);
    Ui.el('div', 'pending-slots', card, '需要空位 ' + required);
    const claim = Ui.el(
      'button',
      'small-btn claim-combat-loot',
      card,
      pending.canClaim === false ? '整理背包后领取' : '领取战利品'
    );
    claim.disabled = pending.canClaim === false;
    if (!claim.disabled) {
      claim.addEventListener('click', function () {
        Ui.invokeCommand('claimCombatLoot');
      });
    }
  }

  function renderInjury(host, injury) {
    if (!injury || typeof injury !== 'object') return;
    const card = Ui.el('div', 'card injury-card', host);
    Ui.el('div', 'card-title', card, '重伤撤退');
    Ui.el(
      'div',
      'injury-time',
      card,
      '恢复剩余：' + Ui.fmtDur(injury.remainingSeconds)
    );
    Ui.el(
      'div',
      'injury-lock-message',
      card,
      '重伤期间无法开始战斗'
    );
    const treatment = injury.treatment;
    if (treatment && treatment.itemId) {
      const treat = Ui.el(
        'button',
        'small-btn treat-injury',
        card,
        '使用疗伤丹治疗（持有 ' + (treatment.owned || 0) + '）'
      );
      treat.disabled = treatment.available === false;
      treat.addEventListener('click', function () {
        Ui.invokeCommand('treatInjury');
      });
    }
  }

  function enemyStatText(enemy) {
    const stats = enemy && enemy.stats || {};
    return '气血 ' + (stats.hp || 0) +
      ' · 攻击 ' + (stats.attack || 0) +
      ' · 修为 +' + (enemy.cultivation || 0);
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

  function dropRowItemIds(row) {
    if (!row || typeof row !== 'object') return [];
    if (typeof row.itemId === 'string' && row.itemId) return [row.itemId];
    if (Array.isArray(row.itemIds)) {
      return row.itemIds.filter(function (id) {
        return typeof id === 'string' && id;
      }).slice(0, 4);
    }
    if (typeof row.id === 'string' && row.id) return [row.id];
    return [];
  }

  function dropChipTitle(row, itemName) {
    const minimum = Number(row && row.min) || 0;
    const maximum = Number(row && row.max) || minimum;
    const count = Number(row && row.count);
    let quantity = '';
    if (Number.isFinite(count) && count > 0) {
      quantity = ' ×' + count;
    } else if (minimum > 0) {
      quantity = minimum === maximum
        ? ' ×' + minimum
        : ' ×' + minimum + '–' + maximum;
    }
    const chance = Number.isFinite(row && row.chance)
      ? '（' + Math.round(row.chance * 100) + '%）'
      : '';
    return (itemName || row && row.name || '未知战利品') + quantity + chance;
  }

  function renderDropIconRow(host, rows, className) {
    const wrap = Ui.el('div', className || 'drop-icon-row', host);
    if (!Array.isArray(rows) || !rows.length) {
      Ui.el('span', 'drop-icon-empty', wrap, '无');
      return wrap;
    }
    rows.forEach(function (row) {
      const itemIds = dropRowItemIds(row);
      if (!itemIds.length) {
        const chip = Ui.el('div', 'drop-icon-chip drop-icon-fallback', wrap);
        chip.title = dropChipTitle(row);
        Ui.el('span', 'drop-icon-fallback-text', chip, (row.name || '?').charAt(0));
        Ui.el('span', 'sr-only', chip, dropChipTitle(row));
        return;
      }
      itemIds.forEach(function (itemId, index) {
        const data = Ui.resolveItemTipData({ itemId: itemId });
        const chip = Ui.el(
          'div',
          'drop-icon-chip q-' + (data.quality || 'white'),
          wrap
        );
        chip.title = dropChipTitle(row, data.name);
        Ui.renderItemIcon(Ui.el('div', 'drop-icon-wrap', chip), data);
        Ui.el('span', 'sr-only', chip, dropChipTitle(row, data.name));
        if (Number.isFinite(row.chance) && index === 0) {
          Ui.el(
            'div',
            'drop-icon-chance',
            chip,
            Math.round(row.chance * 100) + '%'
          );
        }
        const count = Number(row.count);
        if (Number.isFinite(count) && count > 0 && index === 0) {
          Ui.el('div', 'drop-icon-qty', chip, String(count));
        }
        Ui.attachItemTipTrigger(chip, data);
      });
    });
    return wrap;
  }

  function combatAreaBannerTone(src) {
    const tones = {
      qingyunOutskirts: ['#C8E0B8', '#7BAF7B', '#5C8A5C'],
      blackIronRidge: ['#D1D5DB', '#6B7280', '#374151'],
      redSandValley: ['#F0D2B0', '#C47A4A', '#8B4513'],
      mistSoulMarsh: ['#D8D0EC', '#7A6BA8', '#4A3F6B'],
      thunderPeak: ['#C8DCF0', '#4A7AB5', '#1E3A5F'],
      voidRift: ['#B8A8D0', '#5B4A7A', '#2A1F3D'],
      starfallAbyss: ['#A8B8E0', '#3A4A7A', '#1A2040'],
      mahayanaAbyss: ['#F0D8B0', '#A86840', '#6B3010'],
      ascensionTerrace: ['#F8F0D0', '#C8A858', '#8A7030'],
      breathCave: ['#C8E0D0', '#6B9A7B', '#3F6B4F'],
      foundationAltar: ['#D8D8E0', '#7A7A8A', '#404050'],
      goldCoreRuins: ['#F0DCC0', '#B07A40', '#6B4018'],
      nascentSoulTower: ['#D0C8E8', '#6A5A98', '#3A2F5A'],
      spiritTransformationPeak: ['#B8D0E8', '#3A6A9A', '#1A3050'],
      voidRefiningRift: ['#A898C0', '#4A3A6A', '#201830'],
      bodyIntegrationPalace: ['#B0C0E0', '#4A5A8A', '#202848'],
      mahayanaTrial: ['#E8D0B0', '#A06038', '#5A3010'],
      ascensionTrial: ['#F4E8C0', '#B89848', '#705820']
    };
    const key = String(src || '').replace(/^.*\//, '').replace(/\.svg$/i, '');
    return tones[key] || ['#E8E0F2', '#9B87B8', '#5C4A78'];
  }

  function renderCombatAreaBanner(host, src, alt) {
    const banner = Ui.el('div', 'combat-area-banner', host);
    const tone = combatAreaBannerTone(src);
    banner.style.background =
      'linear-gradient(180deg, rgba(26,21,32,0.08), rgba(26,21,32,0.28)),' +
      'linear-gradient(135deg, ' + tone[0] + ' 0%, ' + tone[1] +
      ' 55%, ' + tone[2] + ' 100%)';
    if (src) {
      const img = document.createElement('img');
      img.className = 'combat-area-banner-img';
      img.src = src;
      img.alt = alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () {
        if (img.parentNode) img.parentNode.removeChild(img);
      });
      banner.appendChild(img);
    }
    return banner;
  }

  function renderCombatEntryIcon(host, entry) {
    const icon = Ui.el('div', 'combat-entry-icon', host);
    const tone = combatAreaBannerTone(entry && entry.bannerSrc);
    icon.style.background =
      'linear-gradient(145deg, ' + tone[0] + ' 0%, ' + tone[1] +
      ' 55%, ' + tone[2] + ' 100%)';
    if (entry && entry.bannerSrc) {
      const img = document.createElement('img');
      img.className = 'combat-entry-img';
      img.src = entry.bannerSrc;
      img.alt = entry.name || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () {
        if (img.parentNode) img.parentNode.removeChild(img);
      });
      icon.appendChild(img);
    }
    if (!entry || !entry.unlocked) {
      const lock = Ui.el('div', 'combat-entry-lock', icon);
      lock.setAttribute('aria-hidden', 'true');
      lock.innerHTML =
        '<svg viewBox="0 0 24 24" width="22" height="22" focusable="false">' +
        '<path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h1.5A1.5 1.5 0 0 1 20 11.5v8A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10zm2 0h6V8a3 3 0 0 0-6 0z"/>' +
        '</svg>';
    }
    return icon;
  }

  function closeEnemyDetailModal() {
    const m = Ui.modals.enemyDetail;
    if (m && m.root) m.root.style.display = 'none';
    if (m) m.signature = '';
  }

  function closeRegionDetailModal() {
    closeEnemyDetailModal();
    Ui.combatUiState.selectedRegionId = null;
    Ui.combatUiState.selectedEnemyId = null;
    const m = Ui.modals.regionDetail;
    if (m && m.root) m.root.style.display = 'none';
    if (m) m.signature = '';
  }

  function buildRegionDetailModal(m) {
    m.root.addEventListener('click', function (event) {
      if (event && event.target === m.root) closeRegionDetailModal();
    });
    const modal = Ui.el('div', 'modal region-detail-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeRegionDetailModal);
    m.refs = {
      title: Ui.el('div', 'modal-title region-detail-title', modal, '区域详情'),
      body: Ui.el('div', 'modal-body region-detail-body', modal)
    };
    m.signature = '';
  }

  function buildEnemyDetailModal(m) {
    m.root.addEventListener('click', function (event) {
      if (event && event.target === m.root) closeEnemyDetailModal();
    });
    const modal = Ui.el('div', 'modal enemy-detail-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeEnemyDetailModal);
    m.refs = {
      body: Ui.el('div', 'modal-body enemy-detail-body', modal)
    };
    m.signature = '';
  }

  function enemyAccent(enemyId) {
    const accents = [
      ['#E8D5B5', '#C49A6C'],
      ['#D7E2D0', '#7FA57A'],
      ['#D9E3EE', '#6F90B5'],
      ['#E7D8E8', '#9A78A8'],
      ['#F0D9D4', '#C47B6E'],
      ['#D8E8E4', '#5F9A8E']
    ];
    const text = String(enemyId || '');
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash + text.charCodeAt(i) * (i + 1)) % 997;
    }
    return accents[hash % accents.length];
  }

  function renderRegionEnemyIcon(host, enemy, className) {
    const icon = Ui.el('div', className || 'region-enemy-icon', host);
    const portraitSrc = resolveEnemyPortraitSrc(enemy);
    if (portraitSrc) {
      icon.classList.add('has-art');
      const img = Ui.el('img', 'region-enemy-art', icon);
      img.alt = (enemy && enemy.name) || '妖兽';
      img.decoding = 'async';
      img.src = portraitSrc;
      img.addEventListener('error', function () {
        icon.classList.remove('has-art');
        icon.innerHTML = '';
        const tone = enemyAccent(enemy && enemy.id);
        icon.style.background =
          'linear-gradient(160deg, ' + tone[0] + ' 0%, ' + tone[1] + ' 100%)';
        Ui.el(
          'span',
          'region-enemy-glyph',
          icon,
          (enemy && enemy.name ? enemy.name : '?').charAt(0)
        );
      });
      return icon;
    }
    const tone = enemyAccent(enemy && enemy.id);
    icon.style.background =
      'linear-gradient(160deg, ' + tone[0] + ' 0%, ' + tone[1] + ' 100%)';
    Ui.el(
      'span',
      'region-enemy-glyph',
      icon,
      (enemy && enemy.name ? enemy.name : '?').charAt(0)
    );
    return icon;
  }

  function findRegionEnemy(region, enemyId) {
    const enemies = region && Array.isArray(region.enemies)
      ? region.enemies
      : [];
    return enemies.find(function (enemy) {
      return enemy.id === enemyId;
    }) || enemies[0] || null;
  }

  function dropChanceLabel(chance) {
    if (!Number.isFinite(chance)) return '必掉';
    return Math.round(chance * 100) + '%';
  }

  function dropQuantityLabel(row) {
    const minimum = Number(row && row.min) || 0;
    const maximum = Number(row && row.max) || minimum;
    if (minimum <= 0 && maximum <= 0) return '×1';
    if (minimum === maximum) return '×' + minimum;
    return '×' + minimum + '–' + maximum;
  }

  function expandDropRows(rows) {
    const result = [];
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      const ids = dropRowItemIds(row);
      if (!ids.length) {
        result.push({
          itemId: '',
          name: row && row.name ? row.name : '未知战利品',
          min: row && row.min,
          max: row && row.max,
          chance: row && row.chance
        });
        return;
      }
      ids.forEach(function (itemId) {
        const data = Ui.resolveItemTipData({ itemId: itemId });
        result.push({
          itemId: itemId,
          name: data.name || itemId,
          quality: data.quality,
          icon: data.icon,
          iconSrc50: data.iconSrc50,
          iconSrc100: data.iconSrc100,
          min: row.min,
          max: row.max,
          chance: row.chance
        });
      });
    });
    return result;
  }

  function renderEnemyDropList(host, drops) {
    const list = Ui.el('div', 'enemy-drop-list', host);
    const rows = expandDropRows(drops);
    if (!rows.length) {
      Ui.el('div', 'enemy-drop-empty', list, '暂无掉落');
      return list;
    }
    rows.forEach(function (row, index) {
      const line = Ui.el(
        'div',
        'enemy-drop-row' + (index % 2 ? ' is-alt' : ''),
        list
      );
      const iconHost = Ui.el('div', 'enemy-drop-icon', line);
      if (row.itemId) {
        const data = Ui.resolveItemTipData(row);
        Ui.renderItemIcon(iconHost, data);
        Ui.attachItemTipTrigger(line, data);
      } else {
        Ui.el('span', 'enemy-drop-fallback', iconHost, (row.name || '?').charAt(0));
      }
      Ui.el('div', 'enemy-drop-name', line, row.name || '未知物品');
      Ui.el('div', 'enemy-drop-qty', line, dropQuantityLabel(row));
      Ui.el('div', 'enemy-drop-chance', line, dropChanceLabel(row.chance));
    });
    return list;
  }

  function renderEnemySkillList(host, enemy) {
    const list = Ui.el('div', 'enemy-skill-list', host);
    const stats = enemy && enemy.stats || {};
    const ticks = Number(stats.attackIntervalTicks) || 8;
    const seconds = Math.max(0.5, ticks * 0.25);
    const basic = enemy && enemy.basicAttack
      ? enemy.basicAttack
      : { name: '扑击', glyph: '扑' };
    const skill = Ui.el('div', 'enemy-skill-row', list);
    const icon = Ui.el('div', 'enemy-skill-icon', skill);
    Ui.el(
      'span',
      'enemy-skill-glyph',
      icon,
      basic.glyph || (basic.name ? basic.name.charAt(0) : '扑')
    );
    const main = Ui.el('div', 'enemy-skill-main', skill);
    Ui.el('div', 'enemy-skill-name', main, basic.name || '扑击');
    Ui.el(
      'div',
      'enemy-skill-meta',
      main,
      '伤害 ×1.0　CD' +
        seconds.toFixed(1).replace(/\.0$/, '') + 's'
    );
    return list;
  }

  function buildEnemyDetailBody(host, region, enemy, view) {
    host.innerHTML = '';
    if (!enemy) {
      Ui.el('div', 'muted', host, '妖兽不存在');
      return;
    }
    const lockedFight = !region || !region.unlocked ||
      !!(view && view.active) ||
      !!(view && view.injury) ||
      !!(view && view.pendingLoot);
    const stats = enemy.stats || {};
    const head = Ui.el('div', 'enemy-detail-head', host);
    renderRegionEnemyIcon(head, enemy, 'enemy-detail-icon');
    const info = Ui.el('div', 'enemy-detail-info', head);
    Ui.el('div', 'enemy-detail-name', info, enemy.name || '未知妖兽');
    Ui.el(
      'div',
      'enemy-detail-stats',
      info,
      '气血 ' + (stats.hp || 0) +
        '　攻击 ' + (stats.attack || 0) +
        '　防御 ' + (stats.defense || 0)
    );

    Ui.el('div', 'enemy-detail-divider', host);
    Ui.el('div', 'region-detail-section', host, '掉落物品');
    renderEnemyDropList(host, enemy.drops);

    Ui.el('div', 'enemy-detail-divider', host);
    Ui.el('div', 'region-detail-section', host, '技能');
    renderEnemySkillList(host, enemy);

    if (region) {
      Ui.el(
        'div',
        'region-detail-reward',
        host,
        '击杀修为 +' + (enemy.cultivation || 0) + ' / 次'
      );
      const button = Ui.el(
        'button',
        'small-btn region-enter-action enemy-action',
        host,
        region.unlocked ? '挑战此妖兽' : '尚未开放'
      );
      button.disabled = lockedFight;
      button.addEventListener('click', function () {
        Ui.invokeCommand('startAction', {
          key: 'combat:region:' + region.id + ':' + enemy.id
        });
      });
    }
  }

  function openEnemyDetailModal(region, enemy, view) {
    if (!enemy || !enemy.id) return;
    Ui.combatUiState.selectedEnemyId = enemy.id;
    const m = Ui.modals.enemyDetail;
    if (!m.root) return;
    if (!m.built) {
      buildEnemyDetailModal(m);
      m.built = true;
    }
    buildEnemyDetailBody(m.refs.body, region, enemy, view || {});
    m.signature = enemy.id;
    m.root.style.display = 'flex';
  }

  function refreshRegionDetailModal(region, view) {
    const m = Ui.modals.regionDetail;
    if (!m || !m.refs || !m.refs.body) return;
    m.refs.title.textContent = region.name || '区域详情';
    Ui.buildRegionDetailBody(m.refs.body, region, view || {});
    m.signature = Ui.regionDetailSignature(region, view || {});
  }

  function buildRegionDetailBody(host, region, view) {
    host.innerHTML = '';
    if (!region) {
      Ui.el('div', 'muted', host, '区域不存在');
      return;
    }
    const lockedFight = !!view.active || !!view.injury || !!view.pendingLoot;
    Ui.el(
      'div',
      'region-detail-desc',
      host,
      region.description || '此地妖兽出没，可前往历练。'
    );
    Ui.el('div', 'region-detail-divider', host);
    Ui.el('div', 'region-detail-section', host, '出没妖兽');
    const enemies = Array.isArray(region.enemies) ? region.enemies : [];
    if (!enemies.length) {
      Ui.el('div', 'muted', host, '暂无可挑战敌人');
      return;
    }
    let selected = findRegionEnemy(region, Ui.combatUiState.selectedEnemyId);
    if (!selected) selected = enemies[0];
    Ui.combatUiState.selectedEnemyId = selected.id;

    const grid = Ui.el('div', 'region-enemy-grid', host);
    enemies.forEach(function (enemy) {
      const item = Ui.el(
        'button',
        'region-enemy-entry' +
          (enemy.id === selected.id ? ' is-selected' : ''),
        grid
      );
      item.type = 'button';
      renderRegionEnemyIcon(item, enemy);
      Ui.el('div', 'region-enemy-name', item, enemy.name || '未知');
      Ui.el('div', 'region-enemy-hint', item, '点击查看掉落');
      item.addEventListener('click', function () {
        Ui.combatUiState.selectedEnemyId = enemy.id;
        openEnemyDetailModal(region, enemy, view);
        refreshRegionDetailModal(region, view);
      });
    });

    Ui.el('div', 'region-detail-divider', host);
    Ui.el(
      'div',
      'region-detail-reward',
      host,
      '击杀修为 +' + (selected.cultivation || 0) + ' / 次'
    );
    const button = Ui.el(
      'button',
      'small-btn region-enter-action enemy-action',
      host,
      region.unlocked ? '进入区域' : '尚未开放'
    );
    button.disabled = !region.unlocked || lockedFight;
    button.addEventListener('click', function () {
      Ui.invokeCommand('startAction', {
        key: 'combat:region:' + region.id + ':' + selected.id
      });
    });
  }

  function regionDetailSignature(region, view) {
    return JSON.stringify([
      region,
      Ui.combatUiState.selectedEnemyId || '',
      !!(view && view.active),
      !!(view && view.injury),
      !!(view && view.pendingLoot)
    ]);
  }

  function openRegionDetailModal(region, view) {
    if (!region || !region.id) return;
    Ui.combatUiState.selectedRegionId = region.id;
    const enemies = Array.isArray(region.enemies) ? region.enemies : [];
    Ui.combatUiState.selectedEnemyId = enemies[0] ? enemies[0].id : null;
    Ui.closeDungeonDetailModal();
    closeEnemyDetailModal();
    const m = Ui.modals.regionDetail;
    if (!m.root) return;
    if (!m.built) {
      buildRegionDetailModal(m);
      m.built = true;
    }
    refreshRegionDetailModal(region, view || {});
    m.root.style.display = 'flex';
  }

  function syncRegionDetailModal(view) {
    const m = Ui.modals.regionDetail;
    if (!m || !m.root) return;
    const selectedId = Ui.combatUiState.selectedRegionId;
    if (!selectedId || Ui.combatUiState.tab !== 'regions') {
      if (m.root.style.display !== 'none') closeRegionDetailModal();
      return;
    }
    const regions = view && Array.isArray(view.regions) ? view.regions : [];
    const region = regions.find(function (row) {
      return row.id === selectedId;
    });
    if (!region) {
      closeRegionDetailModal();
      return;
    }
    if (!m.built) {
      buildRegionDetailModal(m);
      m.built = true;
    }
    m.root.style.display = 'flex';
    const nextSig = regionDetailSignature(region, view || {});
    if (m.signature === nextSig) return;
    refreshRegionDetailModal(region, view || {});
  }

  function renderRegionCards(host, view) {
    const grid = Ui.el('div', 'combat-entry-grid region-entry-grid', host);
    const regions = view && Array.isArray(view.regions)
      ? view.regions
      : [];
    if (!regions.length) {
      Ui.el('div', 'placeholder', grid, '暂无可挑战区域');
      return;
    }
    regions.forEach(function (region) {
      const entry = Ui.el(
        'button',
        'combat-entry region-entry region-card' +
          (region.unlocked ? '' : ' is-locked') +
          (Ui.combatUiState.selectedRegionId === region.id
            ? ' is-selected'
            : ''),
        grid
      );
      entry.type = 'button';
      renderCombatEntryIcon(entry, region);
      Ui.el('div', 'combat-entry-name', entry, region.name || '未知区域');
      entry.addEventListener('click', function () {
        openRegionDetailModal(region, view);
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
        '前置秘境' + (prerequisites.priorDungeon.met ? '已完成' : '未完成')
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

  function dungeonWaveSummary(waves) {
    if (!Array.isArray(waves) || !waves.length) return '无波次';
    return waves.length + ' 波 · ' + waves.map(function (wave) {
      return (wave.enemyName || '未知') +
        '（' + (wave.rankLabel || '未知') + '）×' + (wave.count || 0);
    }).join(' → ');
  }

  function closeDungeonDetailModal() {
    Ui.combatUiState.selectedDungeonId = null;
    const m = Ui.modals.dungeonDetail;
    if (m && m.root) m.root.style.display = 'none';
    if (m) m.signature = '';
  }

  function buildDungeonDetailModal(m) {
    m.root.addEventListener('click', function (event) {
      if (event && event.target === m.root) closeDungeonDetailModal();
    });
    const modal = Ui.el('div', 'modal dungeon-detail-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', closeDungeonDetailModal);
    m.refs = {
      title: Ui.el('div', 'modal-title region-detail-title', modal, '秘境详情'),
      body: Ui.el('div', 'modal-body dungeon-detail-body', modal)
    };
    m.signature = '';
  }

  function buildDungeonDetailBody(host, dungeon, view) {
    host.innerHTML = '';
    if (!dungeon) {
      Ui.el('div', 'muted', host, '秘境不存在');
      return;
    }
    const lockedFight = !!view.active || !!view.injury || !!view.pendingLoot;
    Ui.el(
      'div',
      'region-detail-desc',
      host,
      dungeon.description || '险地秘境，通关可获丰厚奖励。'
    );
    Ui.el('div', 'region-detail-divider', host);
    Ui.el('div', 'region-detail-section', host, '秘境波次');
    const waves = Array.isArray(dungeon.waves) ? dungeon.waves : [];
    const waveGrid = Ui.el('div', 'region-enemy-grid dungeon-waves', host);
    if (!waves.length) {
      Ui.el('div', 'muted', host, '无波次');
    } else {
      waves.forEach(function (wave) {
        const item = Ui.el('div', 'region-enemy-entry is-static', waveGrid);
        renderRegionEnemyIcon(item, {
          id: wave.enemyId,
          name: wave.enemyName,
          portraitSrc: wave.portraitSrc || ''
        });
        Ui.el(
          'div',
          'region-enemy-name',
          item,
          wave.enemyName || '未知'
        );
        Ui.el(
          'div',
          'region-enemy-hint',
          item,
          (wave.rankLabel || '未知') + ' ×' + (wave.count || 0)
        );
      });
    }
    Ui.el(
      'div',
      'dungeon-prerequisites',
      host,
      '前置：' + prerequisiteText(dungeon.prerequisites)
    );
    const clearDone = !!(dungeon.firstClear && dungeon.firstClear.completed);
    Ui.el(
      'div',
      'first-clear' + (clearDone ? ' is-done' : ''),
      host,
      clearDone ? '首通：已完成' : '首通：未完成'
    );
    Ui.el('div', 'region-detail-divider', host);
    const firstRewards = Ui.el('div', 'first-clear-rewards', host);
    Ui.el('div', 'combat-reward-label', firstRewards, '首通');
    renderDropIconRow(
      firstRewards,
      dungeon.firstClear && dungeon.firstClear.rewardRows,
      'drop-icon-row'
    );
    const repeat = Ui.el('div', 'repeat-rewards', host);
    Ui.el('div', 'combat-reward-label', repeat, '重复');
    renderDropIconRow(repeat, dungeon.repeatDrops, 'drop-icon-row');
    const button = Ui.el(
      'button',
      'small-btn dungeon-action region-enter-action',
      host,
      dungeon.unlocked ? '进入秘境' : '尚未开放'
    );
    button.disabled = !dungeon.unlocked || lockedFight;
    button.addEventListener('click', function () {
      Ui.invokeCommand('startAction', {
        key: 'combat:dungeon:' + dungeon.id
      });
    });
  }

  function dungeonDetailSignature(dungeon, view) {
    return JSON.stringify([
      dungeon,
      !!(view && view.active),
      !!(view && view.injury),
      !!(view && view.pendingLoot)
    ]);
  }

  function openDungeonDetailModal(dungeon, view) {
    if (!dungeon || !dungeon.id) return;
    Ui.combatUiState.selectedDungeonId = dungeon.id;
    closeRegionDetailModal();
    const m = Ui.modals.dungeonDetail;
    if (!m.root) return;
    if (!m.built) {
      buildDungeonDetailModal(m);
      m.built = true;
    }
    m.refs.title.textContent = dungeon.name || '秘境详情';
    buildDungeonDetailBody(m.refs.body, dungeon, view || {});
    m.signature = dungeonDetailSignature(dungeon, view || {});
    m.root.style.display = 'flex';
  }

  function syncDungeonDetailModal(view) {
    const m = Ui.modals.dungeonDetail;
    if (!m || !m.root) return;
    const selectedId = Ui.combatUiState.selectedDungeonId;
    if (!selectedId || Ui.combatUiState.tab !== 'dungeons') {
      if (m.root.style.display !== 'none') closeDungeonDetailModal();
      return;
    }
    const dungeons = view && Array.isArray(view.dungeons) ? view.dungeons : [];
    const dungeon = dungeons.find(function (row) {
      return row.id === selectedId;
    });
    if (!dungeon) {
      closeDungeonDetailModal();
      return;
    }
    if (!m.built) {
      buildDungeonDetailModal(m);
      m.built = true;
    }
    m.refs.title.textContent = dungeon.name || '秘境详情';
    m.root.style.display = 'flex';
    const nextSig = dungeonDetailSignature(dungeon, view || {});
    if (m.signature === nextSig) return;
    buildDungeonDetailBody(m.refs.body, dungeon, view || {});
    m.signature = nextSig;
  }

  function renderDungeonCards(host, view) {
    const grid = Ui.el('div', 'combat-entry-grid dungeon-entry-grid', host);
    const dungeons = view && Array.isArray(view.dungeons)
      ? view.dungeons
      : [];
    if (!dungeons.length) {
      Ui.el('div', 'placeholder', grid, '暂无可挑战秘境');
      return;
    }
    dungeons.forEach(function (dungeon) {
      const entry = Ui.el(
        'button',
        'combat-entry dungeon-entry dungeon-card' +
          (dungeon.unlocked ? '' : ' is-locked') +
          (Ui.combatUiState.selectedDungeonId === dungeon.id
            ? ' is-selected'
            : ''),
        grid
      );
      entry.type = 'button';
      renderCombatEntryIcon(entry, dungeon);
      Ui.el('div', 'combat-entry-name', entry, dungeon.name || '未知秘境');
      entry.addEventListener('click', function () {
        openDungeonDetailModal(dungeon, view);
      });
    });
  }

  function combatListSignature(view, canonical, loadouts) {
    const parts = [
      Ui.combatUiState.tab,
      Ui.combatUiState.selectedRegionId || '',
      Ui.combatUiState.selectedEnemyId || '',
      Ui.combatUiState.selectedDungeonId || ''
    ];
    function pushInjury(src) {
      const injury = src && src.injury;
      parts.push(
        injury
          ? ((injury.active || injury.recovering) ? 1 : 0) +
            ':' + (injury.itemId || '') +
            ':' + (injury.canTreat ? 1 : 0)
          : '0'
      );
    }
    function pushLoot(src) {
      const loot = src && src.pendingLoot;
      parts.push(loot && loot.waiting ? ('1:' + (loot.count || 0)) : '0');
    }
    function pushRegions(src) {
      const regions = src && src.regions;
      if (!Array.isArray(regions)) {
        parts.push('r0');
        return;
      }
      parts.push('r' + regions.length);
      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        parts.push(
          (region.id || '') + ':' + (region.unlocked ? 1 : 0) +
            ':' + (region.enemies && region.enemies.length || 0)
        );
      }
    }
    function pushDungeons(src) {
      const dungeons = src && src.dungeons;
      if (!Array.isArray(dungeons)) {
        parts.push('d0');
        return;
      }
      parts.push('d' + dungeons.length);
      for (let i = 0; i < dungeons.length; i++) {
        const dungeon = dungeons[i];
        parts.push(
          (dungeon.id || '') + ':' + (dungeon.unlocked ? 1 : 0) +
            ':' + (dungeon.cleared ? 1 : 0)
        );
      }
    }
    pushInjury(view);
    pushInjury(canonical);
    pushLoot(view);
    pushLoot(canonical);
    if (Ui.combatUiState.tab === 'dungeons') pushDungeons(view);
    else pushRegions(view);
    if (canonical && canonical !== view) pushRegions(canonical);
    const plans = loadouts && loadouts.plans;
    if (Array.isArray(plans)) {
      parts.push(
        'L' + (loadouts.activeId || '') + ':' + plans.length
      );
      for (let i = 0; i < plans.length; i++) {
        const plan = plans[i];
        parts.push((plan.id || '') + ':' + (plan.name || ''));
      }
    } else {
      parts.push('L0');
    }
    return parts.join('|');
  }

  function refreshInjuryCountdown(host, view, canonical) {
    const injury = (view && view.injury) || (canonical && canonical.injury);
    if (!injury || !host || typeof host.querySelector !== 'function') return;
    const node = host.querySelector('.injury-card .injury-time');
    if (node) node.textContent = '恢复剩余：' + Ui.fmtDur(injury.remainingSeconds);
  }

  function renderCombatView() {
    const refs = Ui.contentState.refs;
    if (!refs.combatHost || !refs.combatTabs) return;
    Array.prototype.forEach.call(
      refs.combatTabs.children,
      function (button, index) {
        button.classList.toggle(
          'active',
          Ui.COMBAT_TABS[index][0] === Ui.combatUiState.tab
        );
      }
    );
    const host = refs.combatHost;
    const view = Ui.safeQuery(
      'combat',
      { tab: Ui.combatUiState.tab },
      null
    );
    const loadouts = Ui.safeQuery('combatLoadouts', undefined, null);
    const canonical = Ui.combatUiState.tab === 'regions'
      ? view
      : Ui.safeQuery('combat', { tab: 'regions' }, null);

    // ── 战斗进行中：切到独立战斗界面（隐藏页签，逐帧增量更新）──
    const activeBattle = (view && view.active) ||
      (canonical && canonical.active);
    if (activeBattle && (activeBattle.player ||
        activeBattle.layout === 'vertical-team')) {
      closeRegionDetailModal();
      closeDungeonDetailModal();
      refs.combatTabs.style.display = 'none';
      refs.combatSignature = null; // 退出战斗后强制重建列表页
      renderBattleScreen(host, activeBattle, loadouts);
      return;
    }
    refs.combatTabs.style.display = '';
    if (Ui.contentState.refs.battle) Ui.contentState.refs.battle = null;

    // 轻量结构签名：避免整份 combat/loadouts JSON.stringify。
    // 重伤 remainingSeconds 只走 refreshInjuryCountdown，不进签名。
    const signature = combatListSignature(view, canonical, loadouts);
    refreshInjuryCountdown(host, view, canonical);
    if (refs.combatSignature === signature) {
      if (Ui.combatUiState.tab === 'regions') syncRegionDetailModal(view);
      if (Ui.combatUiState.tab === 'dungeons') syncDungeonDetailModal(view);
      return;
    }
    refs.combatSignature = signature;
    host.innerHTML = '';
    if (!view) {
      Ui.buildReserve(host, 'combat-unavailable', '战斗', '战斗数据暂不可用');
      return;
    }
    renderPendingLoot(
      host,
      view.pendingLoot || (canonical && canonical.pendingLoot)
    );
    renderInjury(host, view.injury || (canonical && canonical.injury));
    if (Ui.combatUiState.tab === 'dungeons') {
      closeRegionDetailModal();
      renderDungeonCards(host, view);
      syncDungeonDetailModal(view);
      return;
    }
    closeDungeonDetailModal();
    renderRegionCards(host, view);
    syncRegionDetailModal(view);
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
    if (type === 'always' || type === 'selfMissingShield') {
      return { type: type };
    }
    if (type === 'selfHpBelow' || type === 'enemyHpBelow' ||
        type === 'selfQiAbove' || type === 'selfQiBelow') {
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
    if (type === 'enemyHasStatus' || type === 'enemyMissingStatus') {
      return { type: type, statusId: text };
    }
    return { type: type, buffId: text };
  }

  function planUsesInstanceEquipment(plan) {
    return (plan && Array.isArray(plan.equipment) ? plan.equipment : [])
      .some(function (row) {
        return row && (
          Object.prototype.hasOwnProperty.call(row, 'instanceId') ||
          Object.prototype.hasOwnProperty.call(row, 'unlocked')
        );
      });
  }

  function equipmentSlotFilled(row) {
    return !!(row && (row.instanceId || row.itemId));
  }

  function ensureLoadoutSelection(plan) {
    const rows = plan && Array.isArray(plan.equipment) ? plan.equipment : [];
    const slots = rows.map(function (row) { return row.slot; });
    if (slots.indexOf(Ui.loadoutUiState.selectedEquipmentSlot) < 0) {
      const firstUnlocked = rows.find(function (row) {
        return row && row.unlocked !== false;
      });
      Ui.loadoutUiState.selectedEquipmentSlot =
        (firstUnlocked && firstUnlocked.slot) || slots[0] || null;
    }
    const supplyRows = plan && Array.isArray(plan.supplies)
      ? plan.supplies
      : [];
    const supplySlots = supplyRows.map(function (row) { return row.slot; });
    if (supplySlots.indexOf(Ui.loadoutUiState.selectedSupplySlot) < 0) {
      Ui.loadoutUiState.selectedSupplySlot = supplySlots[0] || 'food';
    }
    const kind = Ui.loadoutUiState.selectedTechniqueKind === 'passive'
      ? 'passive'
      : 'active';
    Ui.loadoutUiState.selectedTechniqueKind = kind;
    const techRows = kind === 'passive'
      ? (plan && plan.passiveTechniques) || []
      : (plan && plan.activeTechniques) || [];
    if (
      Ui.loadoutUiState.selectedTechniqueIndex < 0 ||
      Ui.loadoutUiState.selectedTechniqueIndex >= techRows.length
    ) {
      Ui.loadoutUiState.selectedTechniqueIndex = 0;
    }
  }

  function formatDerivedStatsLine(stats) {
    if (!stats || typeof stats !== 'object') return '';
    const parts = [];
    [
      ['attack', '攻'],
      ['defense', '防'],
      ['maxHp', '血'],
      ['maxQi', '气'],
      ['hit', '命中'],
      ['critRate', '暴击']
    ].forEach(function (entry) {
      const key = entry[0];
      const label = entry[1];
      if (stats[key] == null) return;
      let value = stats[key];
      if (key === 'critRate' && Number(value) <= 1) {
        value = Math.round(Number(value) * 100) + '%';
      } else {
        value = Math.round(Number(value)) || value;
      }
      parts.push(label + ' ' + value);
    });
    return parts.join(' · ');
  }

  function renderCandidateEmpty(parent, title, guide) {
    const box = Ui.el('div', 'equipment-candidate-empty equipment-candidate-empty-compact', parent);
    Ui.el('div', 'equipment-candidate-empty-title', box, title || '暂无可用');
    if (guide) {
      Ui.el('div', 'equipment-candidate-empty-guide', box, guide);
    }
  }

  function renderBodyModeBanner(parent, plan) {
    const mode = Ui.loadoutUiState.bodyMode === 'equipment'
      ? 'equipment'
      : 'supply';
    const banner = Ui.el(
      'div',
      'equipment-body-mode is-' + mode,
      parent
    );
    if (mode === 'equipment') {
      const slot = Ui.loadoutUiState.selectedEquipmentSlot;
      const label = Ui.EQUIPMENT_LABELS[slot] || slot || '装备';
      Ui.el('span', 'equipment-body-mode-prefix', banner, '正在配置');
      Ui.el('strong', 'equipment-body-mode-target', banner, label);
      const back = Ui.el(
        'button',
        'equipment-body-mode-back',
        banner,
        '返回补给'
      );
      back.type = 'button';
      back.addEventListener('click', function (event) {
        if (event && event.stopPropagation) event.stopPropagation();
        Ui.loadoutUiState.bodyMode = 'supply';
        Ui.hideEquipmentTip();
        Ui.renderEquipmentPage({ uiOnly: true });
      });
      return;
    }
    const tab = normalizeSupplySubTab(Ui.loadoutUiState.subTab);
    Ui.el('span', 'equipment-body-mode-prefix', banner, '战斗补给');
    Ui.el('strong', 'equipment-body-mode-target', banner, Ui.SUPPLY_LABELS[tab] || tab);
    const status = supplyStatusText(plan, tab);
    if (status) {
      Ui.el('span', 'equipment-body-mode-status', banner, status);
    }
  }

  function equipmentEmptyTitle(slot) {
    const label = Ui.EQUIPMENT_LABELS[slot] || '装备';
    return '暂无可用的' + label;
  }

  function equipmentEmptyGuide() {
    return '去炼器或秘境获取后会显示在这里';
  }

  function supplyEmptyTitle(slot) {
    if (slot === 'food') return '暂无可用的食物';
    if (slot === 'pill') return '暂无可用的丹药';
    if (slot === 'talisman') return '暂无可用的符箓';
    return '暂无可用补给';
  }

  function supplyEmptyGuide(slot) {
    if (slot === 'food') return '去烹饪或钓鱼获得后会显示在这里';
    if (slot === 'pill') return '去炼丹获取后会显示在这里';
    if (slot === 'talisman') return '去制符获取后会显示在这里';
    return '获取后会显示在这里';
  }

  function countEquippedSlots(plan) {
    const rows = plan && Array.isArray(plan.equipment) ? plan.equipment : [];
    let filled = 0;
    let total = 0;
    rows.forEach(function (row) {
      if (!row || row.unlocked === false) return;
      total += 1;
      if (equipmentSlotFilled(row)) filled += 1;
    });
    return { filled: filled, total: total };
  }

  function equipmentPageSignature(uiState, loadouts, plan) {
    const tabs = Array.isArray(loadouts && loadouts.tabs)
      ? loadouts.tabs.map(function (tab) {
        return [
          tab.id,
          tab.name,
          tab.active ? 1 : 0,
          tab.editingLocked ? 1 : 0
        ];
      })
      : [];
    const equipment = plan && Array.isArray(plan.equipment)
      ? plan.equipment.map(function (row) {
        return [
          row.slot,
          row.instanceId || row.itemId || '',
          row.unlocked === false ? 0 : 1,
          row.enhancementLevel || 0,
          row.quality || '',
          Array.isArray(row.options) ? row.options.length : 0
        ];
      })
      : [];
    const supplies = plan && Array.isArray(plan.supplies)
      ? plan.supplies.map(function (row) {
        return [
          row.slot,
          row.itemId || '',
          row.available || 0,
          row.config && row.config.triggerRatio,
          row.config && row.config.stopWhenEmpty ? 1 : 0,
          Array.isArray(row.options) ? row.options.length : 0
        ];
      })
      : [];
    return JSON.stringify([
      uiState.selectedId,
      uiState.bodyMode,
      uiState.subTab,
      uiState.selectedEquipmentSlot,
      uiState.selectedSupplySlot,
      uiState.selectedSupplySlotIndexes &&
        uiState.selectedSupplySlotIndexes.food,
      uiState.selectedSupplySlotIndexes &&
        uiState.selectedSupplySlotIndexes.pill,
      uiState.selectedSupplySlotIndexes &&
        uiState.selectedSupplySlotIndexes.talisman,
      loadouts && loadouts.activeLoadoutId,
      loadouts && loadouts.canCreate,
      loadouts && loadouts.maxLoadouts,
      tabs,
      equipment,
      supplies,
      plan && plan.id,
      plan && plan.name,
      plan && plan.active ? 1 : 0,
      plan && plan.editingLocked ? 1 : 0
    ]);
  }

  function supplySlotIndex(slot) {
    if (!Ui.loadoutUiState.selectedSupplySlotIndexes) {
      Ui.loadoutUiState.selectedSupplySlotIndexes = {
        food: 0,
        pill: 0,
        talisman: 0
      };
    }
    return Ui.loadoutUiState.selectedSupplySlotIndexes[slot] || 0;
  }

  function setSupplySlotIndex(slot, index) {
    if (!Ui.loadoutUiState.selectedSupplySlotIndexes) {
      Ui.loadoutUiState.selectedSupplySlotIndexes = {
        food: 0,
        pill: 0,
        talisman: 0
      };
    }
    Ui.loadoutUiState.selectedSupplySlotIndexes[slot] = index;
  }

  function supplyStatusText(plan, slot) {
    const row = findSupplyRow(plan, slot);
    const label = Ui.SUPPLY_LABELS[slot] || slot;
    if (!row || !row.itemId) {
      return label + '：未配置';
    }
    return (row.name || row.itemId) + ' 已装入';
  }

  function supplyUnlockGuide(slot) {
    if (slot === 'pill') {
      return '提升炼丹等级并花费灵石后可解锁更多丹药栏。';
    }
    if (slot === 'talisman') {
      return '提升制符等级并花费灵石后可解锁更多符箓栏。';
    }
    return '提升烹饪等级并花费灵石后可解锁更多食物栏。';
  }

  function normalizeSupplySubTab(subTab) {
    if (subTab === 'food' || subTab === 'pill' || subTab === 'talisman') {
      return subTab;
    }
    if (subTab === 'consumable' || subTab === 'supplies') return 'food';
    if (subTab === 'equipment') return 'food';
    return 'food';
  }

  const SUPPLY_PHYSICAL_SLOT_COUNT = 5;
  const SUPPLY_PHYSICAL_UNLOCKED = Object.freeze({
    food: 1,
    pill: 1,
    talisman: 1
  });

  function renderEquipmentCandidateGrid(parent, plan, locked) {
    const section = Ui.el('div', 'equipment-candidate-panel', parent);
    const slot = Ui.loadoutUiState.selectedEquipmentSlot;
    const row = (plan.equipment || []).find(function (entry) {
      return entry.slot === slot;
    });
    const slotLabel = Ui.EQUIPMENT_LABELS[slot] || slot || '装备';
    Ui.el('div', 'equipment-list-divider', section, '可装备的' + slotLabel);
    if (!row || row.unlocked === false) {
      renderCandidateEmpty(section, '该部位尚未解锁', '提升境界后开放此槽位');
      return;
    }
    const options = Array.isArray(row.options) ? row.options : [];
    if (!options.length) {
      renderCandidateEmpty(
        section,
        equipmentEmptyTitle(slot),
        equipmentEmptyGuide()
      );
      return;
    }
    const grid = Ui.el('div', 'equipment-candidate-grid', section);
    const instanceMode = planUsesInstanceEquipment(plan);
    options.forEach(function (option) {
      const selectedId = row.instanceId || row.itemId;
      const optionId = option.instanceId || option.itemId;
      const card = Ui.el(
        'button',
        'equipment-candidate-card' +
          (optionId && optionId === selectedId ? ' selected' : '') +
          (option.quality ? ' q-' + Ui.uiQuality(option.quality) : ''),
        grid
      );
      card.type = 'button';
      card.disabled = !!locked;
      Ui.renderItemIcon(
        Ui.el('div', 'equipment-candidate-icon', card),
        option,
        { fallback: '◇' }
      );
      Ui.el(
        'div',
        'equipment-candidate-name',
        card,
        option.name || '未知装备'
      );
      const metaBits = [];
      if (option.enhancementLevel > 0) {
        metaBits.push('+' + option.enhancementLevel);
      }
      if (option.available != null && !option.instanceId) {
        metaBits.push('×' + option.available);
      }
      if (metaBits.length) {
        Ui.el(
          'div',
          'equipment-candidate-meta',
          card,
          metaBits.join(' · ')
        );
      }
      card.addEventListener('click', function (event) {
        if (event && event.stopPropagation) event.stopPropagation();
        if (locked || !optionId) return;
        Ui.showQuickActionTip(option, card, {
          meta: slotLabel,
          actionLabel: '装备',
          hideDetail: true,
          onAction: function () {
            Ui.contentState.refs.equipmentLoadoutsCache = null;
            if (instanceMode && option.instanceId) {
              Ui.invokeCommand('equipEquipment', {
                instanceId: option.instanceId,
                loadoutId: plan.id
              });
            } else {
              Ui.invokeCommand('setEquipment', {
                loadoutId: plan.id,
                slot: slot,
                itemId: optionId
              });
            }
          }
        });
      });
    });
  }

  function renderEquipmentSlotPanel(parent, plan, locked, derivedStats) {
    const section = Ui.el('div', 'loadout-section equipment-slot-panel', parent);
    const statsLine = formatDerivedStatsLine(derivedStats);
    if (statsLine) {
      Ui.el('div', 'equipment-derived-stats', section, statsLine);
    }
    const grid = Ui.el(
      'div',
      'equipment-dock-grid equipment-page-slot-grid',
      section
    );
    (plan.equipment || []).forEach(function (row) {
      const filled = equipmentSlotFilled(row);
      const unlocked = row.unlocked !== false;
      const selected = row.slot === Ui.loadoutUiState.selectedEquipmentSlot;
      const slot = Ui.el(
        'button',
        'equipment-dock-slot equipment-page-slot ' +
          (filled ? 'filled' : unlocked ? 'empty' : 'locked') +
          (selected ? ' selected' : ''),
        grid
      );
      slot.type = 'button';
      slot.dataset.slot = row.slot;
      if (filled && row.quality) {
        slot.classList.add('q-' + Ui.uiQuality(row.quality));
      }
      const icon = Ui.el('div', 'equipment-dock-icon', slot);
      if (filled) {
        Ui.renderItemIcon(icon, row, { fallback: '◇' });
      } else {
        icon.textContent = unlocked ? '◇' : '🔒';
      }
      Ui.el(
        'div',
        'equipment-dock-label',
        slot,
        Ui.EQUIPMENT_LABELS[row.slot] || row.slot
      );
      if (filled) {
        Ui.el(
          'div',
          'equipment-dock-item-name',
          slot,
          row.name || '已装备'
        );
      } else if (unlocked) {
        Ui.el('div', 'equipment-dock-item-name is-empty', slot, '空');
      } else {
        Ui.el('div', 'equipment-dock-item-name is-locked', slot, '未解锁');
      }
      if (filled && row.enhancementLevel > 0) {
        Ui.el(
          'span',
          'equipment-dock-level',
          slot,
          '+' + row.enhancementLevel
        );
      }
      if (!unlocked) return;
      slot.addEventListener('click', function (event) {
        if (event && event.stopPropagation) event.stopPropagation();
        const sameSlot =
          Ui.loadoutUiState.selectedEquipmentSlot === row.slot &&
          Ui.loadoutUiState.bodyMode === 'equipment';
        Ui.loadoutUiState.selectedEquipmentSlot = row.slot;
        Ui.loadoutUiState.bodyMode = 'equipment';
        if (filled && sameSlot) {
          Ui.showEquippedEquipmentTip(row, slot, plan.id);
        } else {
          Ui.hideEquipmentTip();
        }
        Ui.renderEquipmentPage({ uiOnly: true });
      });
    });
  }

  function findSupplyRow(plan, slot) {
    return (plan.supplies || []).find(function (row) {
      return row && row.slot === slot;
    }) || null;
  }

  function setSupplyItem(plan, slot, itemId, locked) {
    if (locked) return;
    Ui.contentState.refs.equipmentLoadoutsCache = null;
    Ui.invokeCommand('setSupply', {
      loadoutId: plan.id,
      slot: slot,
      config: slot === 'talisman'
        ? {
          itemId: itemId,
          useAt: 'enemy_start',
          stopWhenEmpty: false
        }
        : {
          itemId: itemId,
          triggerRatio: slot === 'food' ? 0.5 : 0.3,
          stopWhenEmpty: false
        }
    });
  }

  function renderSupplyPhysicalSlots(parent, plan, locked, slotType) {
    const slot = slotType || 'food';
    const label = Ui.SUPPLY_LABELS[slot] || slot;
    const unlockedCount = SUPPLY_PHYSICAL_UNLOCKED[slot] || 1;
    const section = Ui.el(
      'div',
      'loadout-section supply-physical-panel compact',
      parent
    );
    section.dataset.supplyType = slot;
    const head = Ui.el('div', 'supply-slot-head compact', section);
    Ui.el(
      'span',
      'supply-inline-status',
      head,
      supplyStatusText(plan, slot)
    );
    Ui.el(
      'span',
      'supply-inline-unlock',
      head,
      label + '栏 ' + unlockedCount + '/' + SUPPLY_PHYSICAL_SLOT_COUNT
    );
    const grid = Ui.el('div', 'supply-physical-grid food-physical-grid', section);
    const supplyRow = findSupplyRow(plan, slot);
    const activeIndex = supplySlotIndex(slot);
    for (let index = 0; index < SUPPLY_PHYSICAL_SLOT_COUNT; index++) {
      const unlocked = index < unlockedCount;
      const selected = activeIndex === index;
      const filled = unlocked && !!(
        supplyRow && supplyRow.itemId && index === 0
      );
      const button = Ui.el(
        'button',
        'supply-slot-card supply-physical-slot food-physical-slot' +
          (filled ? ' filled' : unlocked ? ' empty' : ' locked') +
          (selected ? ' selected' : ''),
        grid
      );
      button.type = 'button';
      button.dataset.slot = slot;
      button.dataset.slotIndex = String(index);
      Ui.el('div', 'supply-slot-label', button, label + (index + 1));
      const icon = Ui.el('div', 'supply-slot-icon', button);
      if (!unlocked) {
        icon.textContent = '🔒';
        Ui.el('div', 'supply-slot-name is-locked', button, '未解锁');
        button.addEventListener('click', function (event) {
          if (event && event.stopPropagation) event.stopPropagation();
          Ui.hideEquipmentTip();
          if (typeof Ui.showQuickActionTip === 'function') {
            Ui.showQuickActionTip({
              name: label + '栏 ' + (index + 1),
              description: supplyUnlockGuide(slot)
            }, button, {
              meta: '未解锁',
              actionLabel: '知道了',
              hideDetail: true,
              onAction: function () {}
            });
          }
        });
        continue;
      }
      if (filled) {
        Ui.renderItemIcon(icon, {
          itemId: supplyRow.itemId,
          name: supplyRow.name,
          iconSrc50: supplyRow.iconSrc50,
          iconSrc100: supplyRow.iconSrc100
        }, { fallback: label.charAt(0) || '物' });
        Ui.el(
          'div',
          'supply-slot-name',
          button,
          (supplyRow.name || supplyRow.itemId) +
            (supplyRow.available != null ? ' ×' + supplyRow.available : '')
        );
      } else {
        icon.textContent = '◇';
        Ui.el('div', 'supply-slot-name is-empty', button, '空');
      }
      button.addEventListener('click', function (event) {
        if (event && event.stopPropagation) event.stopPropagation();
        setSupplySlotIndex(slot, index);
        Ui.loadoutUiState.selectedSupplySlot = slot;
        Ui.loadoutUiState.subTab = slot;
        Ui.loadoutUiState.bodyMode = 'supply';
        if (filled) {
          Ui.showQuickActionTip({
            itemId: supplyRow.itemId,
            name: supplyRow.name,
            iconSrc50: supplyRow.iconSrc50,
            iconSrc100: supplyRow.iconSrc100,
            description: '点击卸下当前' + label + '。'
          }, button, {
            meta: label,
            actionLabel: '卸下',
            hideDetail: true,
            onAction: function () {
              setSupplyItem(plan, slot, null, locked);
            }
          });
        } else {
          Ui.hideEquipmentTip();
        }
        Ui.renderEquipmentPage({ uiOnly: true });
      });
    }
  }

  function renderSupplyCandidateGrid(parent, plan, locked, slot) {
    const supplySlot = slot || Ui.loadoutUiState.selectedSupplySlot || 'food';
    const section = Ui.el('div', 'equipment-candidate-panel', parent);
    const row = findSupplyRow(plan, supplySlot);
    Ui.el(
      'div',
      'equipment-list-divider',
      section,
      '可用的' + (Ui.SUPPLY_LABELS[supplySlot] || supplySlot || '物品')
    );
    const options = row && Array.isArray(row.options) ? row.options : [];
    if (!options.length) {
      renderCandidateEmpty(
        section,
        supplyEmptyTitle(supplySlot),
        supplyEmptyGuide(supplySlot)
      );
      return;
    }
    const grid = Ui.el('div', 'equipment-candidate-grid', section);
    options.forEach(function (option) {
      const card = Ui.el(
        'button',
        'equipment-candidate-card' +
          (option.itemId && row && option.itemId === row.itemId
            ? ' selected'
            : ''),
        grid
      );
      card.type = 'button';
      card.disabled = !!locked;
      Ui.renderItemIcon(
        Ui.el('div', 'equipment-candidate-icon', card),
        option,
        { fallback: '物' }
      );
      Ui.el(
        'div',
        'equipment-candidate-name',
        card,
        option.name || '未知物品'
      );
      Ui.el(
        'div',
        'equipment-candidate-meta',
        card,
        '×' + (option.available || option.quantity || 0)
      );
      card.addEventListener('click', function (event) {
        if (event && event.stopPropagation) event.stopPropagation();
        if (locked || !option.itemId) return;
        Ui.showQuickActionTip(option, card, {
          meta: Ui.SUPPLY_LABELS[supplySlot] || supplySlot,
          actionLabel: '装入',
          hideDetail: true,
          onAction: function () {
            setSupplyItem(plan, supplySlot, option.itemId, locked);
          }
        });
      });
    });
  }

  function renderEquipmentListBody(parent, plan, locked, loadouts) {
    parent.innerHTML = '';
    renderBodyModeBanner(parent, plan);
    if (Ui.loadoutUiState.bodyMode === 'equipment') {
      renderEquipmentCandidateGrid(parent, plan, locked);
      return;
    }
    const tab = normalizeSupplySubTab(Ui.loadoutUiState.subTab);
    Ui.loadoutUiState.subTab = tab;
    Ui.loadoutUiState.selectedSupplySlot = tab;
    renderSupplyPhysicalSlots(parent, plan, locked, tab);
    renderSupplyCandidateGrid(parent, plan, locked, tab);
  }

  function liveEquipmentPage() {
    Ui.renderEquipmentPage({ fromLive: true });
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

  function queryEquipmentLoadouts(uiOnly) {
    const refs = Ui.contentState.refs;
    const now = Date.now();
    const cache = refs.equipmentLoadoutsCache;
    const cacheAt = refs.equipmentLoadoutsCacheAt || 0;
    // 页签/槽位切换走缓存；live 短 TTL 内也复用，避免反复深拷贝整模。
    if (cache && (uiOnly || now - cacheAt < 800)) {
      return cache;
    }
    const loadouts = Ui.safeQuery('combatLoadouts', undefined, {
      tabs: [],
      plans: [],
      canCreate: false,
      maxLoadouts: 5
    });
    refs.equipmentLoadoutsCache = loadouts;
    refs.equipmentLoadoutsCacheAt = now;
    return loadouts;
  }

  function renderEquipmentPage(options) {
    const opts = options || {};
    const host = Ui.contentState.refs.equipmentPageHost;
    if (!host) return;
    const loadouts = queryEquipmentLoadouts(!!opts.uiOnly);
    const tabs = Array.isArray(loadouts.tabs)
      ? loadouts.tabs.slice(0, 5)
      : [];
    if (!tabs.some(function (tab) {
      return tab.id === Ui.loadoutUiState.selectedId;
    })) {
      Ui.loadoutUiState.selectedId =
        loadouts.activeLoadoutId || (tabs[0] && tabs[0].id) || null;
    }
    const plans = Array.isArray(loadouts.plans) ? loadouts.plans : [];
    const plan = plans.find(function (row) {
      return row.id === Ui.loadoutUiState.selectedId;
    }) || null;
    if (plan) ensureLoadoutSelection(plan);
    Ui.loadoutUiState.subTab = normalizeSupplySubTab(
      Ui.loadoutUiState.subTab
    );
    const signature = equipmentPageSignature(
      Ui.loadoutUiState,
      loadouts,
      plan
    );
    if (Ui.contentState.refs.equipmentPageSignature === signature) return;
    Ui.contentState.refs.equipmentPageSignature = signature;

    // 仅切换页签/槽位时，优先只刷列表区，避免整页拆除导致卡顿。
    if (opts.uiOnly &&
        Ui.contentState.refs.equipmentListHost &&
        plan) {
      const locked = !!plan.editingLocked;
      const slotNodes = [];
      const tabNodes = [];
      let subTabsRoot = null;
      function walk(node) {
        if (!node) return;
        if (node.classList && node.classList.contains('equipment-page-slot')) {
          slotNodes.push(node);
        }
        if (node.classList && node.classList.contains('equipment-subtab')) {
          tabNodes.push(node);
        }
        if (node.classList && node.classList.contains('equipment-subtabs')) {
          subTabsRoot = node;
        }
        const children = node.children || [];
        for (let i = 0; i < children.length; i++) walk(children[i]);
      }
      walk(host);
      if (subTabsRoot) {
        if (Ui.loadoutUiState.bodyMode === 'equipment') {
          subTabsRoot.classList.add('is-dimmed');
        } else {
          subTabsRoot.classList.remove('is-dimmed');
        }
      }
      slotNodes.forEach(function (node) {
        if (node.dataset &&
            node.dataset.slot === Ui.loadoutUiState.selectedEquipmentSlot) {
          node.classList.add('selected');
        } else {
          node.classList.remove('selected');
        }
      });
      tabNodes.forEach(function (node) {
        const active = Ui.loadoutUiState.bodyMode === 'supply' &&
          node.dataset &&
          node.dataset.tab === Ui.loadoutUiState.subTab;
        if (active) node.classList.add('active');
        else node.classList.remove('active');
      });
      renderEquipmentListBody(
        Ui.contentState.refs.equipmentListHost,
        plan,
        locked,
        loadouts
      );
      return;
    }

    host.innerHTML = '';
    Ui.contentState.refs.equipmentListHost = null;

    const titleBar = Ui.el('div', 'equipment-page-title', host);
    Ui.el('div', 'equipment-page-title-main', titleBar, '⚔ 装备');
    if (plan) {
      const worn = countEquippedSlots(plan);
      Ui.el(
        'div',
        'equipment-page-title-meta',
        titleBar,
        '已装备 ' + worn.filled + '/' + worn.total
      );
    }

    const planHeader = Ui.el('div', 'equipment-plan-header', host);
    const tabBar = Ui.el('div', 'loadout-tabs equipment-plan-tabs', planHeader);
    tabs.forEach(function (tab) {
      const button = Ui.el(
        'button',
        'loadout-tab' +
          (tab.id === Ui.loadoutUiState.selectedId ? ' active' : ''),
        tabBar,
        tab.name + (tab.active ? ' · 当前' : '')
      );
      button.addEventListener('click', function () {
        Ui.hideEquipmentTip();
        Ui.loadoutUiState.selectedId = tab.id;
        Ui.contentState.refs.equipmentLoadoutsCache = null;
        renderEquipmentPage();
      });
    });
    if (loadouts.canCreate && tabs.length < (loadouts.maxLoadouts || 5)) {
      const add = Ui.el('button', 'loadout-tab loadout-add', tabBar, '＋新方案');
      add.addEventListener('click', function () {
        Ui.hideEquipmentTip();
        Ui.contentState.refs.equipmentLoadoutsCache = null;
        Ui.invokeCommand('createCombatLoadout', {
          name: firstUnusedPlanName(tabs, loadouts.maxLoadouts)
        });
      });
    }
    if (!plan) {
      if (!Ui.__combatRuntimeReady && Ui.__combatRuntimeLoading) {
        Ui.el('div', 'placeholder', host, '装备方案加载中…');
      } else {
        Ui.el('div', 'placeholder', host, '暂无战斗方案');
      }
      return;
    }

    const management = Ui.el(
      'div',
      'loadout-management equipment-plan-manage',
      planHeader
    );
    const nameInput = Ui.el('input', 'loadout-name-input', management);
    nameInput.type = 'text';
    nameInput.value = plan.name;
    nameInput.maxLength = 12;
    nameInput.placeholder = '方案名';
    nameInput.disabled = !!plan.editingLocked;
    nameInput.addEventListener('change', function () {
      Ui.contentState.refs.equipmentLoadoutsCache = null;
      Ui.invokeCommand('renameCombatLoadout', {
        loadoutId: plan.id,
        name: nameInput.value
      });
    });
    if (!plan.active) {
      const activate = Ui.el(
        'button',
        'small-btn activate-loadout',
        management,
        '启用'
      );
      activate.disabled = !!plan.editingLocked;
      activate.addEventListener('click', function () {
        Ui.contentState.refs.equipmentLoadoutsCache = null;
        Ui.invokeCommand('setActiveCombatLoadout', { loadoutId: plan.id });
      });
    }
    if (plans.length > 1) {
      const remove = Ui.el(
        'button',
        'small-btn delete-loadout',
        management,
        '删除'
      );
      remove.disabled = !!plan.editingLocked;
      remove.addEventListener('click', function () {
        Ui.contentState.refs.equipmentLoadoutsCache = null;
        Ui.invokeCommand('deleteCombatLoadout', { loadoutId: plan.id });
      });
    }
    if (plan.editingLocked) {
      Ui.el(
        'div',
        'loadout-lock-message',
        host,
        '当前战斗方案正在使用，战斗中不可编辑'
      );
    }

    const editor = Ui.el('div', 'loadout-editor equipment-page-body', host);
    const locked = !!plan.editingLocked;
    renderEquipmentSlotPanel(
      editor,
      plan,
      locked,
      plan.active ? loadouts.currentDerivedStats : null
    );

    const subTabs = Ui.el('div', 'equipment-subtabs', editor);
    if (Ui.loadoutUiState.bodyMode === 'equipment') {
      subTabs.classList.add('is-dimmed');
    }
    [
      ['food', '食物'],
      ['pill', '丹药'],
      ['talisman', '符箓']
    ].forEach(function (entry) {
      const button = Ui.el(
        'button',
        'equipment-subtab' +
          (Ui.loadoutUiState.bodyMode === 'supply' &&
            Ui.loadoutUiState.subTab === entry[0] ? ' active' : '') +
          ' tone-supply',
        subTabs,
        entry[1]
      );
      button.type = 'button';
      button.dataset.tab = entry[0];
      button.addEventListener('click', function () {
        Ui.hideEquipmentTip();
        Ui.loadoutUiState.bodyMode = 'supply';
        Ui.loadoutUiState.subTab = entry[0];
        Ui.loadoutUiState.selectedSupplySlot = entry[0];
        renderEquipmentPage({ uiOnly: true });
      });
    });

    const body = Ui.el('div', 'equipment-subtab-body', editor);
    Ui.contentState.refs.equipmentListHost = body;
    body.addEventListener('scroll', function () {
      Ui.hideEquipmentTip();
    }, { passive: true });
    renderEquipmentListBody(body, plan, locked, loadouts);
  }

  function techniqueCandidateRows(library, kind, selectedId, usedIds) {
    return (library || []).filter(function (row) {
      return row.learned &&
        row.kind === kind &&
        (row.id === selectedId || usedIds.indexOf(row.id) < 0);
    });
  }

  function findTechniqueRow(library, techniqueId) {
    if (!techniqueId) return null;
    return (library || []).find(function (row) {
      return row && row.id === techniqueId;
    }) || null;
  }

  function techniqueGlyph(row) {
    if (row && typeof row.name === 'string' && row.name) {
      return row.name.charAt(0);
    }
    return row && row.kind === 'passive' ? '被' : '功';
  }

  function techniqueTone(row) {
    const tag = row && Array.isArray(row.tags) && row.tags[0]
      ? row.tags[0]
      : (row && row.kind) || 'active';
    return Ui.TECHNIQUE_TAG_TONES[tag] || 'active';
  }

  function renderTechniqueIconFace(host, row, options) {
    const opts = options || {};
    const face = Ui.el(
      'div',
      'technique-icon-face tone-' + techniqueTone(row) +
        (opts.empty ? ' empty' : '') +
        (opts.locked ? ' locked' : ''),
      host
    );
    if (opts.locked) {
      face.textContent = '锁';
      return face;
    }
    if (opts.empty || !row) {
      face.textContent = '＋';
      return face;
    }
    if (row.iconSrc50 || row.iconSrc || row.iconSrc100) {
      Ui.renderItemIcon(face, row, { fallback: techniqueGlyph(row) });
    } else {
      face.textContent = techniqueGlyph(row);
    }
    return face;
  }

  function conditionSummaryText(condition) {
    const type = condition && condition.type ? condition.type : 'always';
    const entry = Ui.CONDITION_TYPES.find(function (row) {
      return row[0] === type;
    });
    return entry ? entry[1] : '始终';
  }

  function renderTechniqueCandidateGrid(
    parent,
    plan,
    library,
    locked,
    unlockedActiveCount,
    unlockedPassiveCount
  ) {
    const section = Ui.el('div', 'equipment-candidate-panel technique-picker', parent);
    const kind = Ui.loadoutUiState.selectedTechniqueKind === 'passive'
      ? 'passive'
      : 'active';
    const index = Ui.loadoutUiState.selectedTechniqueIndex || 0;
    const slots = kind === 'passive'
      ? plan.passiveTechniques || []
      : plan.activeTechniques || [];
    const slot = slots[index];
    Ui.el(
      'div',
      'section-title',
      section,
      '更换' + (kind === 'passive' ? '被动' : '主动') +
        ' · 槽' + (index + 1)
    );
    if (!slot) {
      renderCandidateEmpty(section, '暂无功法槽');
      return;
    }
    const unlockLimit = kind === 'passive'
      ? (unlockedPassiveCount || slots.length)
      : (unlockedActiveCount || slots.length);
    const slotLocked = locked || slot.slotIndex >= unlockLimit;
    if (slotLocked && slot.slotIndex >= unlockLimit) {
      renderCandidateEmpty(section, '该功法槽尚未解锁');
      return;
    }
    const usedIds = slots.filter(function (other) {
      return other.slotIndex !== slot.slotIndex;
    }).map(function (other) {
      return other.techniqueId;
    }).filter(Boolean);
    const options = techniqueCandidateRows(
      library,
      kind,
      slot.techniqueId,
      usedIds
    );
    const grid = Ui.el('div', 'technique-icon-grid', section);
    const clear = Ui.el(
      'button',
      'technique-icon-tile clear-tile technique-candidate-card',
      grid
    );
    clear.type = 'button';
    clear.disabled = !!slotLocked;
    Ui.el('div', 'technique-icon-face empty', clear, '空');
    Ui.el('div', 'technique-icon-caption', clear, '卸下');
    clear.addEventListener('click', function () {
      if (slotLocked) return;
      if (kind === 'passive') {
        Ui.invokeCommand('setPassiveTechnique', {
          loadoutId: plan.id,
          slotIndex: slot.slotIndex,
          techniqueId: null
        });
      } else {
        Ui.invokeCommand('setActiveTechnique', {
          loadoutId: plan.id,
          slotIndex: slot.slotIndex,
          techniqueId: null,
          condition: slot.condition || { type: 'always' }
        });
      }
    });
    if (!options.length) {
      renderCandidateEmpty(section, '暂无可用功法');
      return;
    }
    options.forEach(function (row) {
      const tile = Ui.el(
        'button',
        'technique-icon-tile technique-candidate-card' +
          (row.id === slot.techniqueId ? ' selected' : ''),
        grid
      );
      tile.type = 'button';
      tile.disabled = !!slotLocked;
      tile.title = row.name || '';
      renderTechniqueIconFace(tile, row);
      Ui.el('div', 'technique-icon-caption', tile, row.name || '功法');
      Ui.el(
        'div',
        'technique-icon-meta',
        tile,
        'Lv.' + (row.level || 0)
      );
      tile.addEventListener('click', function () {
        if (slotLocked) return;
        if (kind === 'passive') {
          Ui.invokeCommand('setPassiveTechnique', {
            loadoutId: plan.id,
            slotIndex: slot.slotIndex,
            techniqueId: row.id
          });
        } else {
          Ui.invokeCommand('setActiveTechnique', {
            loadoutId: plan.id,
            slotIndex: slot.slotIndex,
            techniqueId: row.id,
            condition: slot.condition || { type: 'always' }
          });
        }
      });
    });
  }

  function renderActiveTechniqueCondition(
    parent,
    plan,
    slot,
    conditionOptions,
    slotLocked
  ) {
    const wrap = Ui.el('div', 'technique-condition-bar', parent);
    Ui.el('span', 'technique-condition-label', wrap, '释放条件');
    const row = Ui.el('div', 'condition-row', wrap);
    const typeSelect = Ui.el('select', 'condition-type', row);
    Ui.CONDITION_TYPES.forEach(function (entry) {
      const option = Ui.addOption(
        typeSelect,
        entry[0],
        entry[1],
        'condition-type-option'
      );
      if ((entry[0] === 'enemyHasStatus' ||
           entry[0] === 'enemyMissingStatus' ||
           entry[0] === 'selfMissingBuff') &&
          conditionOptionRows(entry[0], conditionOptions).length === 0) {
        option.disabled = true;
      }
    });
    const condition = slot.condition || { type: 'always' };
    typeSelect.value = condition.type || 'always';
    const percentCondition = condition.type === 'selfHpBelow' ||
      condition.type === 'enemyHpBelow' ||
      condition.type === 'selfQiAbove' ||
      condition.type === 'selfQiBelow';
    const enumeratedCondition = condition.type === 'enemyHasStatus' ||
      condition.type === 'enemyMissingStatus' ||
      condition.type === 'selfMissingBuff';
    const bareCondition = condition.type === 'always' ||
      condition.type === 'selfMissingShield';
    let valueInput;
    if (enumeratedCondition) {
      valueInput = Ui.el('select', 'condition-option-select', row);
      const options = conditionOptionRows(condition.type, conditionOptions);
      options.forEach(function (option) {
        Ui.addOption(valueInput, option.id, option.label);
      });
      const current = conditionValue(condition);
      valueInput.value = options.some(function (option) {
        return option.id === current;
      }) ? current : (options[0] ? options[0].id : '');
      valueInput.disabled = slotLocked || options.length === 0;
    } else {
      valueInput = Ui.el('input', 'condition-value', row);
      valueInput.type = 'text';
      valueInput.value = conditionValue(condition);
    }
    if (percentCondition && valueInput.tagName === 'INPUT') {
      valueInput.type = 'number';
      valueInput.min = '1';
      valueInput.max = '100';
    }
    if (!enumeratedCondition) {
      valueInput.disabled = bareCondition || slotLocked;
    }
    typeSelect.disabled = slotLocked;
    function save(nextType, raw) {
      const nextCondition = normalizedCondition(
        nextType,
        raw,
        conditionOptions
      );
      if (!nextCondition) return;
      Ui.invokeCommand('setActiveTechnique', {
        loadoutId: plan.id,
        slotIndex: slot.slotIndex,
        techniqueId: slot.techniqueId || null,
        condition: nextCondition
      });
    }
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
  }

  function renderTechniqueSlotPanel(
    parent,
    plan,
    library,
    conditionOptions,
    locked,
    unlockedActiveCount,
    unlockedPassiveCount
  ) {
    const section = Ui.el('div', 'loadout-section technique-slot-panel', parent);
    Ui.el('div', 'section-title', section, '功法配置');
    Ui.el(
      'div',
      'technique-panel-hint',
      section,
      '点选图标槽更换功法；释放只看冷却与真气'
    );

    const activeRow = Ui.el('div', 'technique-icon-row', section);
    Ui.el('span', 'technique-row-label', activeRow, '主动');
    const activeTrack = Ui.el('div', 'technique-icon-track', activeRow);
    (plan.activeTechniques || []).forEach(function (slot) {
      const realmLocked = slot.slotIndex >=
        (unlockedActiveCount || plan.activeTechniques.length);
      const selected =
        Ui.loadoutUiState.selectedTechniqueKind === 'active' &&
        Ui.loadoutUiState.selectedTechniqueIndex === slot.slotIndex;
      const row = findTechniqueRow(library, slot.techniqueId);
      const button = Ui.el(
        'button',
        'technique-icon-slot active-technique-slot' +
          (realmLocked || locked ? ' locked' : '') +
          (selected ? ' selected' : '') +
          (slot.techniqueId ? ' filled' : ' empty'),
        activeTrack
      );
      button.type = 'button';
      button.disabled = !!realmLocked;
      button.title = realmLocked
        ? '未解锁'
        : ((slot.name || '空槽') +
          ' · 释放顺序' + slot.priority);
      renderTechniqueIconFace(button, row || slot, {
        empty: !slot.techniqueId,
        locked: realmLocked
      });
      Ui.el(
        'span',
        'technique-slot-index',
        button,
        String(slot.priority)
      );
      button.addEventListener('click', function () {
        if (realmLocked) return;
        Ui.loadoutUiState.selectedTechniqueKind = 'active';
        Ui.loadoutUiState.selectedTechniqueIndex = slot.slotIndex;
        Ui.renderEquipmentPage();
      });
    });

    const passiveRow = Ui.el('div', 'technique-icon-row', section);
    Ui.el('span', 'technique-row-label', passiveRow, '被动');
    const passiveTrack = Ui.el('div', 'technique-icon-track', passiveRow);
    (plan.passiveTechniques || []).forEach(function (slot) {
      const realmLocked = slot.slotIndex >=
        (unlockedPassiveCount || plan.passiveTechniques.length);
      const selected =
        Ui.loadoutUiState.selectedTechniqueKind === 'passive' &&
        Ui.loadoutUiState.selectedTechniqueIndex === slot.slotIndex;
      const row = findTechniqueRow(library, slot.techniqueId);
      const button = Ui.el(
        'button',
        'technique-icon-slot passive-technique-slot' +
          (realmLocked || locked ? ' locked' : '') +
          (selected ? ' selected' : '') +
          (slot.techniqueId ? ' filled' : ' empty'),
        passiveTrack
      );
      button.type = 'button';
      button.disabled = !!realmLocked || !!locked;
      button.title = realmLocked ? '未解锁' : (slot.name || '空槽');
      renderTechniqueIconFace(button, row || slot, {
        empty: !slot.techniqueId,
        locked: realmLocked
      });
      Ui.el(
        'span',
        'technique-slot-index',
        button,
        String(slot.slotIndex + 1)
      );
      button.addEventListener('click', function () {
        if (realmLocked) return;
        Ui.loadoutUiState.selectedTechniqueKind = 'passive';
        Ui.loadoutUiState.selectedTechniqueIndex = slot.slotIndex;
        Ui.renderEquipmentPage();
      });
    });

    const kind = Ui.loadoutUiState.selectedTechniqueKind === 'passive'
      ? 'passive'
      : 'active';
    const selectedIndex = Ui.loadoutUiState.selectedTechniqueIndex || 0;
    const selectedSlot = kind === 'passive'
      ? (plan.passiveTechniques || [])[selectedIndex]
      : (plan.activeTechniques || [])[selectedIndex];
    if (kind === 'active' && selectedSlot) {
      // 释放条件已取消：只选择上阵功法，由冷却与真气决定是否释放。
    }

    renderTechniqueCandidateGrid(
      parent,
      plan,
      library,
      locked,
      unlockedActiveCount,
      unlockedPassiveCount
    );
  }

  function renderTechniqueLibrary(parent, view) {
    const section = Ui.el('div', 'technique-library', parent);
    const rows = view && Array.isArray(view.techniques)
      ? view.techniques
      : [];
    const learned = rows.filter(function (row) { return row.learned; }).length;
    const readable = rows.filter(function (row) {
      return row.ownedBooks && row.eligible;
    }).length;
    const head = Ui.el('div', 'technique-library-head', section);
    const toggle = Ui.el(
      'button',
      'technique-library-toggle' +
        (Ui.loadoutUiState.techniqueLibraryOpen ? ' open' : ''),
      head,
      (Ui.loadoutUiState.techniqueLibraryOpen ? '收起藏书' : '功法藏书') +
        ' · 已习得 ' + learned + '/' + rows.length +
        (readable ? ' · 可研读 ' + readable : '')
    );
    toggle.type = 'button';
    toggle.addEventListener('click', function () {
      Ui.loadoutUiState.techniqueLibraryOpen =
        !Ui.loadoutUiState.techniqueLibraryOpen;
      Ui.renderEquipmentPage();
    });
    if (!Ui.loadoutUiState.techniqueLibraryOpen) return;

    const grid = Ui.el('div', 'technique-icon-grid library-grid', section);
    rows.forEach(function (row) {
      const selected =
        Ui.loadoutUiState.selectedLibraryTechniqueId === row.id;
      const tile = Ui.el(
        'button',
        'technique-icon-tile technique-card' +
          (row.learned ? ' learned' : ' unlearned') +
          (selected ? ' selected' : ''),
        grid
      );
      tile.type = 'button';
      tile.title = row.name || '';
      renderTechniqueIconFace(tile, row);
      Ui.el('div', 'technique-icon-caption', tile, row.name || '功法');
      Ui.el(
        'div',
        'technique-icon-meta',
        tile,
        row.learned ? 'Lv.' + (row.level || 0) : '未习得'
      );
      tile.addEventListener('click', function () {
        Ui.loadoutUiState.selectedLibraryTechniqueId =
          selected ? null : row.id;
        Ui.renderEquipmentPage();
      });
    });

    const focused = rows.find(function (row) {
      return row.id === Ui.loadoutUiState.selectedLibraryTechniqueId;
    });
    if (!focused) return;
    const detail = Ui.el('div', 'card technique-card-detail', section);
    Ui.el('div', 'card-title', detail, focused.name);
    Ui.el(
      'div',
      'technique-book-count',
      detail,
      '功法书 ×' + (focused.ownedBooks || 0) +
        ' · ' + (focused.learned ? '已习得' : '未习得')
    );
    Ui.el(
      'div',
      'technique-progress',
      detail,
      '等级 ' + (focused.level || 0) +
        ' · ' + (focused.xp || 0) + '/' + (focused.xpNeeded || 0)
    );
    Ui.el(
      'div',
      'technique-meta',
      detail,
      (focused.kind === 'active' ? '主动' : '被动') +
        ' · 标签 ' + (focused.tagLabels || []).join('/') +
        ' · 真气 ' + (focused.qiCost || 0) +
        ' · 冷却 ' + (focused.cooldownTicks || 0)
    );
    Ui.el(
      'div',
      'technique-effect',
      detail,
      '效果：' + (focused.effectText || '无')
    );
    const consume = Ui.el(
      'button',
      'small-btn consume-technique-book',
      detail,
      focused.learned ? '吸收功法书' : '研读功法书'
    );
    consume.disabled = !focused.ownedBooks || !focused.eligible;
    consume.addEventListener('click', function () {
      Ui.invokeCommand('consumeTechniqueBook', { itemId: focused.bookItemId });
    });
  }


  function buildEquipmentPage(c) {
    c.classList.add('equipment-page');
    Ui.contentState.refs.equipmentPageHost = Ui.el('div', 'equipment-page-host', c);
    Ui.contentState.refs.equipmentPageSignature = null;
    Ui.contentState.refs.equipmentLoadoutsCache = null;
    Ui.contentState.refs.equipmentListHost = null;
    Ui.renderEquipmentPage();
  }

  Ui.buildCombat = buildCombat;
  Ui.liveCombat = liveCombat;
  Ui.activeLoadoutForBattle = activeLoadoutForBattle;
  Ui.battleMeter = battleMeter;
  Ui.battleActionRow = battleActionRow;
  Ui.buildBattleFaction = buildBattleFaction;
  Ui.buildBattleUnit = buildBattleUnit;
  Ui.buildBattleUnitSkills = buildBattleUnitSkills;
  Ui.pushBattleLog = pushBattleLog;
  Ui.buildBattleScreen = buildBattleScreen;
  Ui.buildTeamBattleScreen = buildTeamBattleScreen;
  Ui.buildTeamBattleUnit = buildTeamBattleUnit;
  Ui.updateTeamBattleSkills = updateTeamBattleSkills;
  Ui.updateTeamBattleUnit = updateTeamBattleUnit;
  Ui.syncTeamBattleUnits = syncTeamBattleUnits;
  Ui.battleSceneLabel = battleSceneLabel;
  Ui.updateBattleLocationHead = updateBattleLocationHead;
  Ui.updateTeamBattleScreen = updateTeamBattleScreen;
  Ui.findBattleUnitRefs = findBattleUnitRefs;
  Ui.playPortraitSwing = playPortraitSwing;
  Ui.playBorderFlash = playBorderFlash;
  Ui.resolveBattleFloatSpec = resolveBattleFloatSpec;
  Ui.spawnBattleActionFloat = spawnBattleActionFloat;
  Ui.playBattleActionFx = playBattleActionFx;
  Ui.playNewBattleActions = playNewBattleActions;
  Ui.updateBattleMeter = updateBattleMeter;
  Ui.battleAttackProgress = battleAttackProgress;
  Ui.updateBattleChips = updateBattleChips;
  Ui.battleEnemyGlyph = battleEnemyGlyph;
  Ui.escapeXml = escapeXml;
  Ui.enemyPortraitPalette = Ui.enemyPortraitPalette;
  Ui.enemyPortraitSvgMarkup = Ui.enemyPortraitSvgMarkup;
  Ui.resolveEnemyPortraitSrc = resolveEnemyPortraitSrc;
  Ui.renderEnemyPortrait = renderEnemyPortrait;
  Ui.renderAllyPortrait = renderAllyPortrait;
  Ui.diffBattleFrame = diffBattleFrame;
  Ui.syncBattleUnits = syncBattleUnits;
  Ui.updateBattleUnit = updateBattleUnit;
  Ui.renderBattleSupplies = renderBattleSupplies;
  Ui.updateBattleScreen = updateBattleScreen;
  Ui.setBattleLootCount = setBattleLootCount;
  Ui.renderBattleLoot = renderBattleLoot;
  Ui.buildLootCell = buildLootCell;
  Ui.renderBattleScreen = renderBattleScreen;
  Ui.renderPendingLoot = renderPendingLoot;
  Ui.renderInjury = renderInjury;
  Ui.enemyStatText = enemyStatText;
  Ui.dropPreviewText = dropPreviewText;
  Ui.rewardRowsText = rewardRowsText;
  Ui.dropRowItemIds = dropRowItemIds;
  Ui.dropChipTitle = dropChipTitle;
  Ui.renderDropIconRow = renderDropIconRow;
  Ui.combatAreaBannerTone = combatAreaBannerTone;
  Ui.renderCombatAreaBanner = renderCombatAreaBanner;
  Ui.renderCombatEntryIcon = renderCombatEntryIcon;
  Ui.closeEnemyDetailModal = closeEnemyDetailModal;
  Ui.closeRegionDetailModal = closeRegionDetailModal;
  Ui.buildRegionDetailModal = buildRegionDetailModal;
  Ui.buildEnemyDetailModal = buildEnemyDetailModal;
  Ui.enemyAccent = enemyAccent;
  Ui.renderRegionEnemyIcon = renderRegionEnemyIcon;
  Ui.findRegionEnemy = findRegionEnemy;
  Ui.dropChanceLabel = dropChanceLabel;
  Ui.dropQuantityLabel = dropQuantityLabel;
  Ui.expandDropRows = expandDropRows;
  Ui.renderEnemyDropList = renderEnemyDropList;
  Ui.renderEnemySkillList = renderEnemySkillList;
  Ui.buildEnemyDetailBody = buildEnemyDetailBody;
  Ui.openEnemyDetailModal = openEnemyDetailModal;
  Ui.refreshRegionDetailModal = refreshRegionDetailModal;
  Ui.buildRegionDetailBody = buildRegionDetailBody;
  Ui.regionDetailSignature = regionDetailSignature;
  Ui.openRegionDetailModal = openRegionDetailModal;
  Ui.syncRegionDetailModal = syncRegionDetailModal;
  Ui.renderRegionCards = renderRegionCards;
  Ui.prerequisiteText = prerequisiteText;
  Ui.dungeonWaveSummary = dungeonWaveSummary;
  Ui.closeDungeonDetailModal = closeDungeonDetailModal;
  Ui.buildDungeonDetailModal = buildDungeonDetailModal;
  Ui.buildDungeonDetailBody = buildDungeonDetailBody;
  Ui.dungeonDetailSignature = dungeonDetailSignature;
  Ui.openDungeonDetailModal = openDungeonDetailModal;
  Ui.syncDungeonDetailModal = syncDungeonDetailModal;
  Ui.renderDungeonCards = renderDungeonCards;
  Ui.combatListSignature = combatListSignature;
  Ui.refreshInjuryCountdown = refreshInjuryCountdown;
  Ui.renderCombatView = renderCombatView;
  Ui.conditionValue = conditionValue;
  Ui.conditionOptionRows = conditionOptionRows;
  Ui.normalizedCondition = normalizedCondition;
  Ui.planUsesInstanceEquipment = planUsesInstanceEquipment;
  Ui.equipmentSlotFilled = equipmentSlotFilled;
  Ui.ensureLoadoutSelection = ensureLoadoutSelection;
  Ui.formatDerivedStatsLine = formatDerivedStatsLine;
  Ui.renderCandidateEmpty = renderCandidateEmpty;
  Ui.renderEquipmentCandidateGrid = renderEquipmentCandidateGrid;
  Ui.renderEquipmentSlotPanel = renderEquipmentSlotPanel;
  Ui.renderSupplyCandidateGrid = renderSupplyCandidateGrid;
  Ui.techniqueCandidateRows = techniqueCandidateRows;
  Ui.findTechniqueRow = findTechniqueRow;
  Ui.techniqueGlyph = techniqueGlyph;
  Ui.techniqueTone = techniqueTone;
  Ui.renderTechniqueIconFace = renderTechniqueIconFace;
  Ui.conditionSummaryText = conditionSummaryText;
  Ui.renderTechniqueCandidateGrid = renderTechniqueCandidateGrid;
  Ui.renderActiveTechniqueCondition = renderActiveTechniqueCondition;
  Ui.renderTechniqueSlotPanel = renderTechniqueSlotPanel;
  Ui.renderTechniqueLibrary = renderTechniqueLibrary;
  Ui.buildEquipmentPage = buildEquipmentPage;
  Ui.liveEquipmentPage = liveEquipmentPage;
  Ui.firstUnusedPlanName = firstUnusedPlanName;
  Ui.renderEquipmentPage = renderEquipmentPage;

  Ui.registerPage('combat', { build: function (nav, host) { buildCombat(host); }, live: function () { liveCombat(); } });
  Ui.registerPage('equipment', { build: function (nav, host) { buildEquipmentPage(host); }, live: function () { liveEquipmentPage(); } });

})();
